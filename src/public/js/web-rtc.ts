import Notifier from './notifier';
import PictionaryServerConnection from './server-connection';
import MediaOfferOutMessage from '../../messages/outgoing/media-offer-message.out';
import BaseMessageOutgoing from '../../messages/outgoing/base-message.out';
import MediaAnswerOutMessage from '../../messages/outgoing/media-answer-message.out';
import ICECandidateOutMessage from '../../messages/outgoing/ice-candidate-message.out';
import MediaOfferMessage from '../../messages/media-offer-message';
import MediaAnswerMessage from '../../messages/media-answer-message';
import ICECandidateMessage from '../../messages/ice-candidate-message';
import MediaNotConnectedError from './media-not-allowed.error copy';
import MediaNotAllowedError from './media-not-allowed.error';
import ChangeVideoStatusMessage from '../../messages/change-video-status';

export interface IPeer {
    playerId: string;
    mediaStream?: MediaStream;
    connection: RTCPeerConnection;
}

export default class PictionaryWebRTC {
    public peers: { [id: string]: IPeer; } = {};
    private readonly mediaStreamConstraints = {
        video: true,
        audio: true,
    };

    private localMediaStream?: MediaStream;
    private myPlayerId?: string;

    constructor(private readonly notifier: Notifier,
                private readonly serverConnection: PictionaryServerConnection) {
        this.serverConnection.on('media-offer', this.handleOffer.bind(this));
        this.serverConnection.on('media-answer', this.handleAnswer.bind(this));
        this.serverConnection.on('new-ice-candidate', this.handleICECandidate.bind(this));
    }

    public setPlayerId(id: string): void {
        this.myPlayerId = id;
    }

    public getMyStream(): MediaStream | undefined {
        return this.localMediaStream;
    }

    public removePlayer(playerId: string) {
        const peer = this.peers[playerId];

        if (peer === undefined) {
            return;
        }

        if (peer.connection) {
            peer.connection.close();
        }
        delete this.peers[playerId];
    }

    public async connectMedia(): Promise<void> {
        try {
            this.trace('Requesting local videostream');
            this.localMediaStream = await navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints);
            this.serverConnection.sendMessage(new ChangeVideoStatusMessage(true));
        } catch (e) {
            // TODO: Handle correctly
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                this.notifier.error('You did not give permission for your microphone or camera.', 10);
                throw new MediaNotAllowedError();
            } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
                this.notifier.error('We did not detect a microphone or camera.');
                throw new MediaNotConnectedError();
            } else {
                this.notifier.error('Something went wrong while trying to connect to you microphone or camera.');
                console.error(e);
                throw new MediaNotAllowedError();
            }
            return;
        }
    }

    public async newPeerConnection(playerId: string, playerName: string) {
        const peer = this.setupNewPeer(playerId, playerName);

        this.trace(`Initiating connection to peer: ${playerName}`);

        try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
        } catch (e) {
            this.notifier.error(`Something went wrong while trying to send your video to ${playerName}`);
            console.error(e);
            return;
        }

        const mediaMessage = new MediaOfferMessage(this.myPlayerId!, playerId, peer.connection.localDescription!);
        console.log(mediaMessage);

        this.serverConnection.sendMessage(mediaMessage);
        this.trace(`Send offer to peer: ${playerName}`);
    }

    private setupNewPeer(playerId: string, playerName: string): IPeer {
        if (this.localMediaStream === undefined) {
            throw new MediaNotConnectedError();
        }

        const peer: IPeer = {
            playerId,
            connection: new RTCPeerConnection({
                iceServers: [
                    {
                        urls: 'stun:stun.l.google.com:19302',
                    }
                ]
            }),
        };

        peer.connection.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
            if (ev.candidate) {
                this.trace(`Sending ICE candidate to peer: ${playerName}`);
                this.serverConnection.sendMessage(new ICECandidateMessage(this.myPlayerId!, playerId, ev.candidate));
            }
            // Catch error
        };

        peer.connection.oniceconnectionstatechange = (ev: Event) => {
            return;
        };

        peer.connection.ontrack = (ev: RTCTrackEvent) => {
            peer.mediaStream = ev.streams[0];
            this.trace(`Received remote stream for player ${playerName}`);
        };

        this.localMediaStream.getTracks().forEach((track) => peer.connection.addTrack(track, this.localMediaStream!));

        this.peers[playerId] = peer;

        return peer;
    }

    private async handleOffer(message: BaseMessageOutgoing) {
        const m = message as MediaOfferOutMessage;
        const peer = this.setupNewPeer(m.senderId, 'Jan'); // TODO
        const playerName = 'Jan';
        this.trace(`Received offer from: ${playerName}`);

        peer.connection.setRemoteDescription(new RTCSessionDescription(m.payload));

        try {
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);
        } catch (e) {
            this.notifier.error(`Something went wrong while trying to send video to ${playerName}`);
            console.error(e);
            return;
        }

        this.serverConnection.sendMessage(
            new MediaAnswerMessage(this.myPlayerId!, m.senderId, peer.connection.localDescription!));
        this.trace(`Send answer to peer: ${playerName}`);
    }

    private handleAnswer(message: BaseMessageOutgoing) {
        const m = message as MediaAnswerOutMessage;
        const peer = this.peers[m.senderId];

        if (peer) {
            peer.connection.setRemoteDescription(new RTCSessionDescription(m.payload));
        }
    }

    private async handleICECandidate(message: BaseMessageOutgoing) {
        const m = message as ICECandidateOutMessage;

        if (this.peers[m.senderId]) {
            const candidate = new RTCIceCandidate(m.payload);
            try {
                await this.peers[m.senderId].connection.addIceCandidate(candidate);
            } catch (e) {
                console.error(e);
            }
        }
    }

    private trace(m: string) {
        console.info(`WebRTC: ${m}`);
    }
}
