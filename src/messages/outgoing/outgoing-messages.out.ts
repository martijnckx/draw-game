import { Type } from 'class-transformer';
import BaseMessageOutgoing from './base-message.out';
import JoinedMessage from './joined-message.out';
import ErrorMessage from './error-message.out';
import NewPlayerMessage from './new-player.out';
import NewChatMessage from './new-chat-message.out';
import NextWordMessage from './next-word.out';
import CorrectGuessMessage from './correct-guess.out';
import CloseGuessMessage from './close-guess.out';
import SpoilerAlertMessage from './spoiler-alert.out';
import AlreadyCorrectMessage from './already-correct.out';
import CoordsMessage from './coords.out';
import RejoinedMessage from './rejoined.out';
import DisconnectedMessage from './disconnected.out';
import MediaOfferOutMessage from './media-offer-message.out';
import MediaAnswerOutMessage from './media-answer-message.out';
import ICECandidateOutMessage from './ice-candidate-message.out';
import PlayerLeftMessage from './player-left.out';
import PlayerChangedVideoStatus from './player-changed-video-status.out';
import ClearCanvasOut from './clear-canvas.out';

export default class OutgoingPictionaryMessage {
    // TODO: Check why message: 'b' transforms to BaseMessage and why it works
    @Type(() => BaseMessageOutgoing, {
        discriminator: {
            property: 'event',
            subTypes: [
                { value: JoinedMessage, name: 'joined' },
                { value: ErrorMessage, name: 'error' },
                { value: NewPlayerMessage, name: 'new-player' },
                { value: NewChatMessage, name: 'new-chat' },
                { value: NextWordMessage, name: 'next-word' },
                { value: CorrectGuessMessage, name: 'correct-guess' },
                { value: CloseGuessMessage, name: 'close-guess' },
                { value: SpoilerAlertMessage, name: 'spoiler-alert' },
                { value: AlreadyCorrectMessage, name: 'already-correct' },
                { value: CoordsMessage, name: 'coords' },
                { value: RejoinedMessage, name: 'rejoin' },
                { value: DisconnectedMessage, name: 'disconnected' },
                { value: MediaOfferOutMessage, name: 'media-offer'},
                { value: MediaAnswerOutMessage, name: 'media-answer'},
                { value: ICECandidateOutMessage, name: 'new-ice-candidate'},
                { value: PlayerLeftMessage, name: 'player-left' },
                { value: PlayerChangedVideoStatus, name: 'player-changed-video-status' },
                { value: ClearCanvasOut, name: 'clear-canvas-out' },
            ]
        },
        keepDiscriminatorProperty: true,
    })
    public message: JoinedMessage | BaseMessageOutgoing | ErrorMessage | NewPlayerMessage |
    NewChatMessage | NextWordMessage | CorrectGuessMessage | CloseGuessMessage | SpoilerAlertMessage |
    AlreadyCorrectMessage | CoordsMessage | RejoinedMessage | DisconnectedMessage |
    MediaOfferOutMessage | MediaAnswerOutMessage | ICECandidateOutMessage | PlayerLeftMessage |
    PlayerChangedVideoStatus | ClearCanvasOut;
}

/* How to add new message
** 1. Add to 'message' types
** 2. Add to @Type() subtypes array
*/
