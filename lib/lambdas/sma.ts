import * as AWS from 'aws-sdk';
import Lex = AWS.LexRuntimeV2;

export type ParticipantTag = "LEG-A" | "LEG-B";

export type E164PhoneNumber = `+${number}`;

export type GuidString = AWS.Chime.GuidString;

export enum EventType {
    NEW_INBOUND_CALL = "NEW_INBOUND_CALL",
    NEW_OUTBOUND_CALL = "NEW_OUTBOUND_CALL",
    ACTION_SUCCESSFUL = "ACTION_SUCCESSFUL",
    ACTION_FAILED = "ACTION_FAILED",
    ACTION_INTERRUPTED = "ACTION_INTERRUPTED",
    HANGUP = "HANGUP",
    CALL_ANSWERED = "CALL_ANSWERED",
    INVALID_LAMBDA_RESPONSE = "INVALID_LAMBDA_RESPONSE",
    DIGITS_RECEIVED = "DIGITS_RECEIVED",
    CALL_UPDATE_REQUESTED = "CALL_UPDATE_REQUESTED",
    RINGING = "RINGING",
}

export enum ActionType {
    CALL_AND_BRIDGE = "CallAndBridge",
    HANGUP = "Hangup",
    JOIN_CHIME_MEETING = "JoinChimeMeeting",
    MODIFY_CHIME_MEETING_ATTENDEES = "ModifyChimeMeetingAttendees",
    PAUSE = "Pause",
    PLAY_AUDIO = "PlayAudio",
    PLAY_AUDIO_AND_GET_DIGITS = "PlayAudioAndGetDigits",
    RECEIVE_DIGITS = "ReceiveDigits",
    RECORD_AUDIO = "RecordAudio",
    SPEAK = "Speak",
    SPEAK_AND_GET_DIGITS = "SpeakAndGetDigits",
    START_BOT_CONVERSATION = "StartBotConversation",
    VOICE_FOCUS = "VoiceFocus",
}

export interface CallEvent {
    SchemaVersion: '1.0',
    Sequence: number,
    InvocationEventType: EventType,
    ActionData?: Action,
    CallDetails: {
        TransactionId: GuidString,
        AwsAccountId: `${number}`,
        AwsRegion: string,
        SipRuleId: GuidString,
        SipMediaApplicationId: GuidString,
        Participants: CallParticipant[],
    }
}

export interface CallParticipant {
    CallId: GuidString,
    ParticipantTag: ParticipantTag,
    To: `+${number}`,
    From: `+${number}`,
    Direction: 'Inbound' | 'Outbound',
    StartTimeInMilliseconds: `${number}`,
    Status?: 'Connected' | 'Disconnected',
    SipHeaders?: Record<string, string>,
}

export interface Action {
    Type: ActionType,
    Parameters: object,
}

export interface CallResponse {
    SchemaVersion: "1.0",
    Actions: Action[]
}

export enum SipResponseCode {
    NORMAL_TERMINATION = "0",
    UNAVAILABLE = "480",
    BUSY = "486",
}

export class SmaAction {

    static endCall(event: CallEvent): Action[] {
        const actions: Action[] = [];
        const callParticipants = event.CallDetails.Participants;
        const legAParticipant = callParticipants.find((p) => p.ParticipantTag === "LEG-A");
        const legBParticipant = callParticipants.find((p) => p.ParticipantTag === "LEG-B");
        if (legAParticipant && legAParticipant.Status !== "Disconnected") {
            actions.push(SmaAction.disconnectLegA());
        }
        if (legBParticipant && legBParticipant.Status !== "Disconnected") {
            actions.push(SmaAction.disconnectLegB());
        }
        return actions;
    }

    static disconnectLegA(responseCode?: SipResponseCode): Action {
        return {
            Type: ActionType.HANGUP,
            Parameters: {
                SipResponseCode: responseCode || SipResponseCode.NORMAL_TERMINATION,
                ParticipantTag: 'LEG-A',
            }
        };
    }

    static disconnectLegB(responseCode?: SipResponseCode): Action {
        return {
            Type: ActionType.HANGUP,
            Parameters: {
                SipResponseCode: responseCode || SipResponseCode.NORMAL_TERMINATION,
                ParticipantTag: 'LEG-B',
            }
        };
    }

    static pause(milliseconds: number): Action {
        return {
            Type: ActionType.PAUSE,
            Parameters: {
                DurationInMilliseconds: Math.ceil(milliseconds).toString(10) as `${number}`,
            }
        };
    }

    static callAndBridge(fromPhoneNumber: E164PhoneNumber, toPhoneNumber: E164PhoneNumber, sipHeaders?: Record<string, string>): Action {
        return {
            Type: ActionType.CALL_AND_BRIDGE,
            Parameters: {
                CallerIdNumber: fromPhoneNumber,
                CallTimeoutSeconds: 10,
                Endpoints: [
                    {
                        Uri: toPhoneNumber,
                        BridgeEndpointType: "PSTN",
                    }
                ],
                SipHeaders: sipHeaders,
            }
        }
    }

    static speak(textType: 'ssml' | 'text', text: string): Action {
        return {
            Type: ActionType.SPEAK,
            Parameters: {
                Engine: 'neural',
                Text: text,
                TextType: textType,
                VoiceId: "Matthew",
            }
        };
    }

    static turnOnVoiceFocus(): Action {
        return {
            Type: ActionType.VOICE_FOCUS,
            Parameters: {
                Enable: true,
            }
        };
    }

    static startBotConversation(event: CallEvent, botAliasArn: string, welcomeMessages: {
        ContentType: Lex.MessageContentType,
        Content: string,
    }[]): Action {
        const sessionAttributes: Record<string, string> = {};
        const legAParticipant = event.CallDetails.Participants.find((p) => p.ParticipantTag === "LEG-A");
        if (legAParticipant) {
            sessionAttributes['callerANI'] = legAParticipant.From;
        }
        return {
            Type: ActionType.START_BOT_CONVERSATION,
            Parameters: {
                BotAliasArn: botAliasArn,
                LocaleId: 'en_US',
                Configuration: {
                    SessionState: {
                        SessionAttributes: sessionAttributes,
                        DialogAction: {
                            Type: "ElicitIntent",
                        }
                    },
                    WelcomeMessages: welcomeMessages,
                }
            }
        };
    }

}