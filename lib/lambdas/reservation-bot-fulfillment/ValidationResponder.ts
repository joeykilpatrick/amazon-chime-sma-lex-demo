import type {LexV2Event, LexV2Result} from 'aws-lambda';

import {LexResponder} from './LexResponder';

export class ValidationResponder extends LexResponder {

    constructor(
        event: LexV2Event,
    ) {
        super(event);
        console.log('Validation event: ', JSON.stringify(event));
    }

    public respond(): LexV2Result {

        this.sessionAttributes['currentSlot'] ||= 'PartySize';
        this.sessionAttributes['errors'] ||= '';

        switch (this.intentName) {

            case 'GetWaitTime':

                const transferMessage = "I'm sorry, but I didn't understand your response."

                switch (this.sessionAttributes['currentSlot']) {

                    case 'PartySize':
                        if (this.slots['PartySize'] === null || !this.slots['PartySize']!.value.resolvedValues.length) {

                            this.sessionAttributes["errors"] += '|';

                            switch (this.sessionAttributes["errors"]) {
                                case '|':
                                    return this.elicitSlot('PartySize', "I'm sorry! I didn't get that. How many are there in your party?");
                                case '||':
                                    return this.elicitSlot('PartySize', "I still didn't get that. One last time. How many people are there in your party?");
                                case '|||':
                                default:
                                    return this.failedResponse(transferMessage);
                            }

                        } else {

                            const partySize: number = parseInt(this.slots['PartySize']!.value.interpretedValue!);
                            if (partySize < 1) {
                                const message = "I'm sorry! I can only estimate wait time, for parties of 1 or more. How many will there be in your group?";
                                return this.elicitSlot('PartySize', message);
                            }

                            this.sessionAttributes['currentSlot'] = 'DiningLocation';
                            this.sessionAttributes['errors'] = '';

                            return this.elicitSlot('DiningLocation', 'Would you like to dine, inside, or out on the patio?');

                        }

                    case 'DiningLocation':
                        if (this.slots['DiningLocation'] === null || !this.slots['DiningLocation']!.value.resolvedValues.length) {

                            this.sessionAttributes["errors"] += '|';

                            switch (this.sessionAttributes["errors"]) {
                                case '|':
                                    return this.elicitSlot('DiningLocation', "I'm sorry! I didn't get that. Would you like to eat inside? Or out on the patio?");
                                case '||':
                                    return this.elicitSlot('DiningLocation', "I still didn't get that. One more time. Where would you like to be seated? Inside? Or outside?");
                                case '|||':
                                default:
                                    return this.failedResponse(transferMessage);
                            }

                        } else {

                            this.sessionAttributes['currentSlot'] = 'AddToWaitList';
                            this.sessionAttributes['errors'] = '';

                            const partySize: number = parseInt(this.slots['PartySize']!.value.interpretedValue!);
                            const diningLocation = this.slots['DiningLocation']!.value.interpretedValue!;
                            const message = this.getWaitTimeMsg(partySize, diningLocation);

                            return this.elicitSlot('AddToWaitList', `${message} Would you like me to add you to the wait list?`);

                        }

                    case 'AddToWaitList':
                        if (this.slots['AddToWaitList'] === null || !this.slots['AddToWaitList']!.value.resolvedValues.length) {

                            this.sessionAttributes["errors"] += '|';

                            switch (this.sessionAttributes["errors"]) {
                                case '|':
                                    return this.elicitSlot('AddToWaitList', "I'm sorry! I didn't get that. Would you like me to add you to the wait list?");
                                case '||':
                                    return this.elicitSlot('AddToWaitList', "I still didn't get that. Would you like me to add you to the wait list?");
                                case '|||':
                                default:
                                    return this.failedResponse(transferMessage);
                            }

                        } else {

                            return this.delegate();

                        }
                }

                return this.delegate();

            case 'FallbackIntent':
                this.interpretation.intent = {
                    name: 'GetWaitTime',
                    slots: {
                        PartySize: null,
                        DiningLocation: null,
                        AddToWaitList: null,
                    },
                    confirmationState: "None",
                    state: "InProgress",
                }
                return this.respond();

            default:
                return this.delegate();
        }
    }

    public getWaitTimeMsg(partySize: number, location: string) {
        const locationText: string = (() => {
            switch (location) {
                case 'outside':
                    return 'on the patio';
                case 'inside':
                    return 'in the dining room';
                default:
                    throw new Error('Unexpected location value.')
            }
        })();

        const waitTime: number = (() => {
            const min = Math.ceil(5);
            const max = Math.floor(61);
            return Math.floor(Math.random() * (max - min) + min);
        })()

        return `The approximate wait time for a party of ${partySize}, ${locationText}, is ${waitTime} minutes.`;
    }

}
