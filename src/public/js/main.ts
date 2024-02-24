import 'reflect-metadata';
import Vue from 'vue';
import '../styles/main.scss';
import Pictionary from './pictionary';
import Notifier from './notifier';
import BaseMessageOutgoing from '../../messages/outgoing/base-message.out';
import ErrorMessage from '../../messages/outgoing/error-message.out';
import errors from './errors';
import JoinedMessage from '../../messages/outgoing/joined-message.out';
import NewPlayerMessage from '../../messages/outgoing/new-player.out';
import NewChatMessage from '../../messages/outgoing/new-chat-message.out';
import NextWordMessage from '../../messages/outgoing/next-word.out';
import CorrectGuessMessage from '../../messages/outgoing/correct-guess.out';
import CloseGuessMessage from '../../messages/outgoing/close-guess.out';
import NewDrawingSettingsMessage from '../../messages/outgoing/drawing-settings.out';
import CoordsMessage from '../../messages/outgoing/coords.out';
import PictionaryWebRTC, { IPeer } from './web-rtc';
import PlayerLeftMessage from '../../messages/outgoing/player-left.out';
import PlayerChangedVideoStatus from '../../messages/outgoing/player-changed-video-status.out';

document.addEventListener('DOMContentLoaded', function () {
    // Variables for vue
    let pictionary: Pictionary;
    let notifier: Notifier;
    let webrtc: PictionaryWebRTC;

    // Functions for vue
    function setColour(c: string) {
        if (!pictionary) return;
        pictionary.setColour(c);
        pictionary.serverConnection.sendDrawingSettings(app.colour, app.eraser, app.fillBucket);
    }

    function logout() {
        presetRoom = '';
        app.room = '';
        app.loggedIn = false;
        app.loginMode = '';
    }

    function isValidRoom(r: string) {
        let valid = true;
        if (r.length !== 4) return false;
        for (let ch of r) {
            if (!"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(ch)) {
                valid = false;
                break;
            }
        }
        return valid;
    }

    function startGame() {
        if (!pictionary) return;
        pictionary.serverConnection.startGame();
    }

    function getInviteText(): string {
        if (!app || !app.room) return '';
        return `Speel mee met pictionary op ${window.location.protocol}//${window.location.hostname}${window.location.port === '80' || window.location.port === '' ? '' : `:${window.location.port}`}?room=${app.room},\nof ga naar ${window.location.protocol}//${window.location.hostname}${window.location.port === '80' || window.location.port === '' ? '' : `:${window.location.port}`} en gebruik de room ${app.room}`
    }

    function roomInClipboard() {
        if (presetRoom) return;
        if (!navigator || !navigator.clipboard || !navigator.clipboard.readText) return;
        navigator.clipboard.readText()
            .then(clip => {
                const c = clip.trim().toUpperCase();
                if (c.length === 4 && isValidRoom(c)) {
                    app.room = c;
                } else if (c.split('\n').length >= 2 && isValidRoom(c.split('\n')[1].split(" ")[c.split('\n')[1].split(" ").length-1])) {
                    app.room = c.split('\n')[1].split(" ")[c.split('\n')[1].split(" ").length-1];
                } else if (isValidRoom(c.split(" ")[c.split(" ").length - 1])) {
                    app.room = c.split(" ")[c.split(" ").length - 1];
                }
            })
            .catch(e => {return;});
    }

    function setCopyTooltip(s: string) {
        app.copyTooltip = s;
        setTimeout(() => {app.copyTooltip = 'Klik om te kopiëren';}, 1000);
    }

    function copyRoomInvite(e: Event) {
        e.preventDefault();
        if (navigator.clipboard) {
        navigator.clipboard
            .writeText(getInviteText())
            .then(() => {
                setCopyTooltip('Gekopieerd!');
            })
            .catch((e) => {
                setCopyTooltip('Er ging iets mis');
            });
        } else {
            const copyText: HTMLInputElement | null = document.querySelector("#room-code");
            if (copyText) {
                copyText.select();
                document.execCommand("copy");
                setCopyTooltip('Gekopieerd!');
            } else {
                setCopyTooltip('Er ging iets mis');
            }
        }
    }

    function secondsLeft (): number {
        if (!pictionary) return -1;
        return pictionary.secondsLeft();
    }

    function getTopGuesser(): string {
        if (!pictionary) return '';
        return pictionary.getTopGuesser();
    }

    function getTopDrawer(): string {
        if (!pictionary) return '';
        return pictionary.getTopDrawer();
    }

    function getScore(type: 'drawer' | 'guesser', playerId: string): number {
        if (!pictionary) {
            return 0;
        }

        let score = pictionary.getScore(type, playerId);
        if (score === undefined) {
            score = 0;
        }

        return score;
    }

    function setLoginMode (mode: string) {
        app.loginMode = mode;
        roomInClipboard();
    }

    function useEraser (e: boolean) {
        if (!pictionary) return;
        pictionary.useEraser(e);
        pictionary.serverConnection.sendDrawingSettings(app.colour, app.eraser, app.fillBucket);
    }

    function useFillBucket (e: boolean) {
        if (!pictionary) return;
        pictionary.useFillBucket(e);
        pictionary.serverConnection.sendDrawingSettings(app.colour, app.eraser, app.fillBucket);
    }

    function login (e: Event) {
        e.preventDefault();
        if (!pictionary) return;
        if ((app.loginMode !== 'new' && app.room.trim().length !== 4) || app.me.name.trim().length < 1 || app.me.name.trim().length > 12) return;
        app.loggedIn = true;
        if (app.loginMode == 'new') {
            pictionary.serverConnection.createRoom(app.me.name.trim());
        }
        else if (app.loginMode == 'join') {
            pictionary.serverConnection.joinRoom(app.room.trim(), app.me.name.trim());
        } else {
            notifier.error("Die actie bestaat niet");
        }
    }

    function sendChatMessage (e: Event) {
        e.preventDefault();
        if (!pictionary) return;

        if (app.chatMessage && app.chatMessage.length > 0 && app.chatMessage.length <= 100) {
            pictionary.serverConnection.sendChatMessage(app.chatMessage);
            pictionary.addChatMessage(app.me.id, app.chatMessage);
        }

        app.chatMessage = '';
    }

    function getPlayerName(id: string) {
        for (let player of app.players) {
            if ((player as any).id === id) {
                return (player as any).name;
            }
        }
        return 'Anoniem';
    }

    async function startRTC(e: Event) {
        e.preventDefault();
        webrtc.setPlayerId(app.me.id);
        try {
            await webrtc.connectMedia(); // TODO: Check if this is the right place
        } catch (e) {
            return;
        }

        app.rtcStarted = true;

        for (const player of app.players) {
            const p = (player as any);
            if (p.id !== app.me.id && p.videoActive) {
                webrtc.newPeerConnection(p.id, p.name);
            }
        }
    }

    function toggleMute(e: Event) {
        app.muted = !app.muted;
    }

    function findGetParameter (parameterName: string): string {
        var result = '',
            tmp = [];
        location.search.substr(1).split('&').forEach(function (item) {
            tmp = item.split('=');
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
        return result;
    }

    function getStreams(): IPeer[] {
        if (webrtc) {
            return Object.values(webrtc.peers).filter((v, i, a) => v.mediaStream !== undefined);
        } else {
            return [];
        }
    }

    function getMyStream(): MediaStream | undefined {
        if (webrtc) {
            return webrtc.getMyStream();
        } else {
            return undefined;
        }
    }

    function startClearCanvas() {
        if (!pictionary) return;
        return pictionary.startClearCanvas();
    }

    function stopClearCanvas() {
        if (!pictionary) return;
        return pictionary.stopClearCanvas();
    }

    let presetRoom = findGetParameter('room').substring(0, 4);
    const presetName = findGetParameter('name').substring(0, 12);

    const app = new Vue({
        el: '#app',
        data: {
            gameStarted: false,
            word: '',
            loggedIn: false,
            loginMode: presetRoom ? 'join' : '', // 'new' or 'join'
            room: presetRoom,
            me: {
                name: presetName,
                id: '',
                owner: false,
            },
            colour: 'black',
            eraser: false,
            fillBucket: false,
            muteEveryone: false,
            drawerId: '',
            notifyMessage: '',
            notifyStyle: '',
            chatMessage: '',
            timeLeft: -1,
            otherStreams: [],
            rtcStarted: false,
            selectColorsVisible: false,
            camerasElement: null,
            copyTooltip: 'Klik om te kopiëren',
            muted: false,
            messages: [],
            players: [],
            clearCanvasLoading: false,
        },
        methods: {
            toggleMute: toggleMute,
            setColour: setColour,
            setLoginMode: setLoginMode,
            useEraser: useEraser,
            useFillBucket: useFillBucket,
            login: login,
            startRTC: startRTC,
            getPlayerName: getPlayerName,
            sendChatMessage: sendChatMessage,
            roomInClipboard: roomInClipboard,
            copyRoomInvite: copyRoomInvite,
            getInviteText: getInviteText,
            getStreams,
            getMyStream,
            getScore,
            startGame: startGame,
            getTopDrawer: getTopDrawer,
            getTopGuesser: getTopGuesser,
            stopClearCanvas: stopClearCanvas,
            startClearCanvas: startClearCanvas,
        },
    });

    setInterval(() => {app.timeLeft = secondsLeft()}, 1000);

    roomInClipboard();
    notifier = new Notifier(app);
    pictionary = new Pictionary(app, notifier);
    webrtc = new PictionaryWebRTC(notifier, pictionary.serverConnection);
    let language: 'nl' | 'en' = 'nl';

    // Events
    pictionary.serverConnection.on('error', (message: BaseMessageOutgoing) => {
        const m = message as ErrorMessage;
        const readable: string | undefined = (errors[language] as any)[m.code];
        notifier.error(readable ? readable : m.code);
        if (m.code === 'room-non-existent') logout();
        if (m.code === 'validation-error') logout();
    });

    pictionary.serverConnection.on('joined', (message: BaseMessageOutgoing) => {
        const m = message as JoinedMessage;
        app.room = m.room;
        app.me.id = m.playerId;
        app.me.owner = m.players.length === 1;
        app.players = [];
        for (let playerString of m.players) {
            const player: {name: string, id: string, videoActive: boolean} = JSON.parse(playerString);
            (app.players as any).push({
                name: player.name,
                id: player.id,
                status: 'guessing',
                videoActive: player.videoActive,
            });
        }
    });

    pictionary.serverConnection.on('new-player', (message: BaseMessageOutgoing) => {
        const m = message as NewPlayerMessage;
        const player: {name: string, id: string, videoActive: boolean} = JSON.parse(m.player);
        (app.players as any).push({
            name: player.name,
            id: player.id,
            status: 'new',
            videoActive: player.videoActive,
        });
        pictionary.addChatMessage('system', `Hartelijk welkom, ${player.name}!`);
    });

    pictionary.serverConnection.on('player-left', (message: BaseMessageOutgoing) => {
        const m = message as PlayerLeftMessage;

        let playerIndex = -1;
        for (let i = 0; i < app.players.length; i++) {
            if ((app.players[i] as any).id === m.playerId) {
                playerIndex = i;
            }
        }

        pictionary.addChatMessage('system', `${getPlayerName(m.playerId)} heeft het spel verlaten!`);

        if (playerIndex >= 0) {
            app.players.splice(playerIndex, 1);
            webrtc.removePlayer(m.playerId);
        }
    });

    pictionary.serverConnection.on('new-chat', (message: BaseMessageOutgoing) => {
        const m = message as NewChatMessage;
        pictionary.addChatMessage(m.senderId, m.content);
    });

    pictionary.serverConnection.on('next-word', (message: BaseMessageOutgoing) => {
        const m = message as NextWordMessage;
        app.eraser = false;
        app.fillBucket = false;
        app.colour = 'black';
        app.selectColorsVisible = false;
        app.drawerId = m.drawerId;
        if (pictionary) {
            pictionary.clearCanvas();
            pictionary.setDrawingId(m.drawerId);
        }
        if (!app.gameStarted) app.gameStarted = true;
        for (let player of app.players) {
            (player as any).status = 'guessing';
            if ((player as any).id === m.drawerId)
                (player as any).status = 'drawing';
        }
        if (m.game_started_time && pictionary) pictionary.setStartTime(new Date(m.game_started_time)); 
        if (m.seconds_in_timer && pictionary) pictionary.setSecondsPerRound(m.seconds_in_timer); 
        if (m.word) {
            const audio = new Audio('doorbell.mp3');
            audio.play();
            app.word = m.word;
        }
        else app.word = '';
        if (!m.prev_word) pictionary.addChatMessage('system', `Pictionary gaat beginnen. Succes!`);
        else if (m.reason === 'everyone-correct') pictionary.addChatMessage('system', `Goed gedaan iedereen! Het woord was ${m.prev_word}.`);
        else if (m.reason === 'time-up') pictionary.addChatMessage('system', `De tijd is om! Het woord was ${m.prev_word}.`);
        else pictionary.addChatMessage('system', `Het woord was ${m.prev_word}.`);
    });

    pictionary.serverConnection.on('correct-guess', (message: BaseMessageOutgoing) => {
        const m = message as CorrectGuessMessage;
        if (pictionary) pictionary.setScores(m.scores);
        for (let player of app.players) {
            if ((player as any).id === m.playerId) (player as any).status = 'correct';
        }
        pictionary.addChatMessage('system', `${getPlayerName(m.playerId)} heeft het woord geraden!`);
    });

    pictionary.serverConnection.on('close-guess', (message: BaseMessageOutgoing) => {
        const m = message as CloseGuessMessage;
        pictionary.addChatMessage('system', `${getPlayerName(m.playerId)} is kortbij.`);
    });

    pictionary.serverConnection.on('spoiler-alert', (message: BaseMessageOutgoing) => {
        pictionary.addChatMessage('system', `Niets voorzeggen! Bericht niet verzonden.`);
    });

    pictionary.serverConnection.on('coords', (message: BaseMessageOutgoing) => {
        const m = message as CoordsMessage;
        if (!pictionary) return;
        pictionary.draw(m.fromX, m.fromY, m.toX, m.toY);
    });

    pictionary.serverConnection.on('new-drawing-settings', (message: BaseMessageOutgoing) => {
        const m = message as NewDrawingSettingsMessage;
        if (!pictionary) return;
        app.colour = m.colour;
        app.eraser = m.eraser;
        app.fillBucket = m.fillBucket;
    });

    pictionary.serverConnection.on('clear-canvas-out', (message: BaseMessageOutgoing) => {
        pictionary.clearCanvas();
    });

    pictionary.serverConnection.on('already-correct', (message: BaseMessageOutgoing) => {
        pictionary.addChatMessage('system', `Je hebt het al geraden! Bericht niet verzonden.`);
    });

    pictionary.serverConnection.on('player-changed-video-status', (message: BaseMessageOutgoing) => {
        const m = message as PlayerChangedVideoStatus;

        for (let i = 0; i < app.players.length; i++) {
            if ((app.players[i] as any).id === m.playerId) {
                (app.players[i] as any).videoActive = m.active;
            }
        }
    });
});
