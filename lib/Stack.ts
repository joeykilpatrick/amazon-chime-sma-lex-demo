import * as CDK from 'aws-cdk-lib';
import * as Lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';

import { ReservationBot } from './ReservationBot'
import { SipMediaApplication } from "./SipMediaApplication";
import { Environment as ReservationIvrEnvironment } from "./lambdas/reservation-ivr-sma-endpoint/environment";
import { SmaEndpointEnvironment } from "./lambdas/sma-endpoint-environment";

export class Stack extends CDK.Stack {

    constructor(scope: Construct, id: string, props: CDK.StackProps) {
        super(scope, id, props);

        const reservationBot = new ReservationBot(this, `${id}-reservation-bot`);

        const targetIvr = new SipMediaApplication(this, `${id}-target-ivr`, {
            lambdaCode: Lambda.Code.fromAsset('./build/target-ivr-sma-endpoint.zip'),
        });

        const reservationIvrEnvironment: Omit<ReservationIvrEnvironment, keyof SmaEndpointEnvironment> = {
            TARGET_IVR_PHONE_NUMBER: targetIvr.phoneNumber,
            RESERVATION_LEX_BOT_ALIAS_ARN: reservationBot.botAlias.attrArn,
        };

        const reservationIvr = new SipMediaApplication(this, `${id}-reservation-ivr`, {
            lambdaCode: Lambda.Code.fromAsset('./build/reservation-ivr-sma-endpoint.zip'),
            lambdaEnvironmentVariables: reservationIvrEnvironment,
        });

        new CDK.CfnOutput(this, `reservation-ivr-phone-number`, {
            value: reservationIvr.phoneNumber,
        });
        new CDK.CfnOutput(this, `target-ivr-phone-number`, {
            value: targetIvr.phoneNumber,
        })
    }
  
}
