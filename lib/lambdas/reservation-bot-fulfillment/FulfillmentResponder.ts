import type {LexV2Event} from "aws-lambda";

import {LexResponder} from './LexResponder';

export class FulfillmentResponder extends LexResponder {

    constructor(
        event: LexV2Event,
    ) {
        super(event);
    }

    public respond() {
        const makeReservation: boolean = this.slots['AddToWaitList']!.value.resolvedValues.includes('Yes');
        if (makeReservation) {
            const reservationId = this.sessionAttributes["callerANI"]?.slice(-4) || "0000";
            this.sessionAttributes["reservationId"] = reservationId;
            const message = `<speak>Your reservation has been confirmed. Your reservation number is <say-as interpret-as="number:digits">${reservationId}</say-as>.</speak>`;
            return this.fulfilledResponse(message, true);
        } else {
            return this.failedResponse('Okay, no reservation was made.');
        }

    }

}
