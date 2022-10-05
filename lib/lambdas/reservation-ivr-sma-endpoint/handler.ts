import {transformAndValidateSync} from "class-transformer-validator";

import {
    Action,
    ActionType,
    CallEvent,
    CallResponse,
    EventType,
    SmaAction,
} from "../sma";
import {Environment} from "./environment";

const environment: Environment = transformAndValidateSync(Environment, process.env);

export async function handler(event: CallEvent): Promise<CallResponse> {

    console.log("Lambda is invoked with call details:" + JSON.stringify(event));
    console.log(event.InvocationEventType)

    const actions: Action[] = (() => {

        switch (event.InvocationEventType) {

            case EventType.NEW_INBOUND_CALL:
                return [
                    SmaAction.turnOnVoiceFocus(),
                    SmaAction.pause(1000),
                    SmaAction.speak('text', "Hello! You've reached the reservation system for Bob's restaurant. For reservations and questions about out current waitlist, I will transfer you to our waitlist assistant."),
                    SmaAction.startBotConversation(event, environment.RESERVATION_LEX_BOT_ALIAS_ARN, [{
                        ContentType: "PlainText",
                        Content: "Hi, I'm the waitlist assistant, powered by Amazon Lex. I can set up your reservation and tell you the current wait times. How many are there in your party?",
                    }]),
                ];

            case EventType.ACTION_SUCCESSFUL:
                switch (event.ActionData!.Type) {
                    case ActionType.START_BOT_CONVERSATION:
                        const actionData: any = event.ActionData; // TODO Need better types for ActionData
                        const intentState: string = actionData.IntentResult.SessionState.Intent.State;
                        const reservationId: string | undefined = actionData.IntentResult.SessionState.SessionAttributes['reservationId'];
                        if (intentState === 'Failed' || !reservationId) {
                            return failureTransferToRestaurant()
                        } else {
                            return successTransferToRestaurant(reservationId);
                        }
                    default:
                        return [];
                }

            case EventType.ACTION_FAILED:
                switch (event.ActionData!.Type) {
                    case ActionType.START_BOT_CONVERSATION:
                        return failureTransferToRestaurant()
                    default:
                        return SmaAction.endCall(event);
                }

            case EventType.INVALID_LAMBDA_RESPONSE:
                return [
                    SmaAction.speak("text", "I'm sorry, there has been an error. Goodbye."),
                    ...SmaAction.endCall(event),
                ];

            case EventType.HANGUP:
                return SmaAction.endCall(event);

            default:
                return [];
        }
    })();

    const response: CallResponse = {
        SchemaVersion: "1.0",
        Actions: actions,
    };

    console.log(actions.map((action) => action.Type));
    console.log("Sending response:" + JSON.stringify(response));

    return response;
}

function successTransferToRestaurant(reservationId: string): Action[] {
    return [
        SmaAction.speak('text', "Looks like your reservation has been confirmed. I will transfer you to the restaurant along with your reservation ID."),
        SmaAction.callAndBridge(environment.SMA_PHONE_NUMBER, environment.TARGET_IVR_PHONE_NUMBER, {
            'x-reservation-id': reservationId,
        }),
    ]
}

function failureTransferToRestaurant(): Action[] {
    return [
        SmaAction.speak('text', "Looks like you weren't able to complete your reservation. Please hold while I transfer you to the restaurant."),
        SmaAction.callAndBridge(environment.SMA_PHONE_NUMBER, environment.TARGET_IVR_PHONE_NUMBER),
    ]
}