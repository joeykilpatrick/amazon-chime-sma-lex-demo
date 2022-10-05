import {
    Action,
    CallEvent,
    CallResponse,
    EventType,
    SmaAction,
} from "../sma";

export async function handler(event: CallEvent): Promise<CallResponse> {

    console.log("Lambda is invoked with call details:" + JSON.stringify(event));
    console.log(event.InvocationEventType)

    const actions: Action[] = (() => {

        switch (event.InvocationEventType) {

            case EventType.NEW_INBOUND_CALL:
                const actions: Action[] = [
                    SmaAction.pause(1000),
                    SmaAction.speak('text', "Hi, you've reached Bob's restaurant."),
                ];
                const reservationId = event.CallDetails.Participants[0]!.SipHeaders?.['x-reservation-id'];
                if (reservationId) {
                    actions.push(SmaAction.speak('ssml', `<speak>Looks like your reservation was confirmed by our assistant. Your reservation ID is <say-as interpret-as="number:digits">${reservationId}</say-as>.</speak>`));
                } else {
                    actions.push(SmaAction.speak('text', "Looks like you weren't able to set up a reservation with our assistant."));
                }
                actions.push(...[
                    SmaAction.speak('text', 'Goodbye.'),
                    ...SmaAction.endCall(event),
                ]);
                return actions;

            case EventType.INVALID_LAMBDA_RESPONSE:
            case EventType.ACTION_FAILED:
                return [
                    SmaAction.speak("text", "I'm sorry, there has been an error. Goodbye."),
                    ...SmaAction.endCall(event),
                ];

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
