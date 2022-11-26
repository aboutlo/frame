import * as uuid from "uuid";
import { InteractionProvider } from "@keystonehq/base-eth-keyring";
import { EventEmitter } from "events";
import {
  EthSignRequest,
  ETHSignature,
  CryptoAccount,
} from "@keystonehq/bc-ur-registry-eth";
import store from "../../../store";

export interface SignRequest {
  signerId: string;
  address: Address;
  request: {
    requestId: string;
    payload: {
      type: string;
      cbor: string;
    };
  };
}

export class KeystoneInteractionProvider
  extends EventEmitter
  implements InteractionProvider
{
  static instance: KeystoneInteractionProvider;

  constructor() {
    super();
    if (KeystoneInteractionProvider.instance) {
      return KeystoneInteractionProvider.instance;
    }
    KeystoneInteractionProvider.instance = this;
  }

  // This function is not used in Frame for syncing but is required in InteractionProvider
  readCryptoHDKeyOrCryptoAccount = () =>
    Promise.resolve(CryptoAccount.fromCBOR(Buffer.from("", "hex")));


  /*
    FrameAccount.signMessage => Keystone/index.ts::signMessage Signer => KeystoneKeyring.signPersonalMessage =>  requestSignature => store => observer => submitSignature
  */
  requestSignature = (signRequest: EthSignRequest, requestTitle?: string, requestDescription?: string): Promise<ETHSignature> => {
    return new Promise((resolve, reject) => {
      const ur = signRequest.toUR();
      const requestIdBuffer = signRequest.getRequestId();
      if (!requestIdBuffer) {
        return reject("signer requestId missing");
      }
      //TODO LS can we use the handlerId from 'main.accounts.requests'? Who is generating the ETHSignature.requestId?
      const requestId = uuid.stringify(requestIdBuffer);
      const signPayload = {
        requestId,
        payload: {
          type: ur.type,
          cbor: ur.cbor.toString("hex"),
        },
      };

      const accounts: Record<string, Account> = store("main.accounts");
      const currentAccount = Object.values(accounts).find(
        (account) => account.active
      );

      if (currentAccount) {
        const { address, signer: signerId, requests } = currentAccount;
        console.log('requestSignature!:', {requests})
        const {handlerId} = Object.values(requests).find(request => request.status === 'pending')
        store.addKeystoneSignRequest({
          handlerId,
          signerId,
          address,
          request: signPayload,
        });

        this.once(`${requestId}-signed`, (cbor: string) => {
          const ethSignature = ETHSignature.fromCBOR(Buffer.from(cbor, "hex"));
          store.resetKeystoneSignRequest(requestId);
          resolve(ethSignature);
        });
      }
    });
  };

  submitSignature = (requestId: string, cbor: string) => {
    const msg = `${requestId}-signed`;
    console.log("submitSignature", { msg });
    this.emit(msg, cbor);
  };
}
