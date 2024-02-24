import JoinMessage from './join-message';
import LeaveMessage from './leave-message';
import WebRTCMessage from './media-offer-message';
import { Type } from 'class-transformer';
import BaseMessage from './base-message';
import { ValidateNested, IsDefined } from 'class-validator';
import CreateMessage from './create-message';
import ChatMessage from './chat-message';
import DrawingSettings from './drawing-settings';
import RejoinMessage from './rejoin-message';
import MediaOfferMessage from './media-offer-message';
import MediaAnswerMessage from './media-answer-message';
import ICECandidateMessage from './ice-candidate-message';
import StartGameMessage from './start-game-message';
import ChangeVideoStatusMessage from './change-video-status';
import ClearCanvasMessage from './clear-canvas-message';

export default class PictionaryMessage {
    // TODO: Check why message: 'b' transforms to BaseMessage and why it works
    @Type(() => BaseMessage, {
        discriminator: {
            property: 'event',
            subTypes: [
                { value: JoinMessage, name: 'join' },
                { value: LeaveMessage, name: 'leave'},
                { value: CreateMessage, name: 'create'},
                { value: ChatMessage, name: 'chat'},
                { value: DrawingSettings, name: 'drawing-settings'},
                { value: RejoinMessage, name: 'rejoin'},
                { value: MediaOfferMessage, name: 'media-offer'},
                { value: MediaAnswerMessage, name: 'media-answer'},
                { value: ICECandidateMessage, name: 'new-ice-candidate'},
                { value: StartGameMessage, name: 'start-game'},
                { value: ChangeVideoStatusMessage, name: 'change-video-status' },
                { value: ClearCanvasMessage, name: 'clear-canvas-message' }
            ]
        },
        keepDiscriminatorProperty: true,
    })
    @ValidateNested()
    @IsDefined()
    public message: JoinMessage | LeaveMessage | CreateMessage |
    ChatMessage | DrawingSettings | RejoinMessage | MediaOfferMessage | MediaAnswerMessage | ICECandidateMessage |
    StartGameMessage | ChangeVideoStatusMessage | ClearCanvasMessage;
}

/* How to add new message
** 1. Add to 'message' types
** 2. Add to @Type() subtypes array
*/
