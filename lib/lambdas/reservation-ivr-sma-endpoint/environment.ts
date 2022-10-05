import {IsString, Matches} from "class-validator";

import {SmaEndpointEnvironment} from "../sma-endpoint-environment";
import {E164PhoneNumber} from "../sma";

export class Environment extends SmaEndpointEnvironment {

    @IsString()
    @Matches(/\+\d*/)
    TARGET_IVR_PHONE_NUMBER!: E164PhoneNumber;

    @IsString()
    RESERVATION_LEX_BOT_ALIAS_ARN!: string;

}
