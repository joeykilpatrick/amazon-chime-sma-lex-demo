import {IsString, Matches} from "class-validator";

import type {E164PhoneNumber} from "./sma";

export class SmaEndpointEnvironment {

    @IsString()
    AWS_REGION!: string;

    @IsString()
    @Matches(/\+\d*/)
    SMA_PHONE_NUMBER!: E164PhoneNumber;

}
