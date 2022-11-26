import { BaseKeyring, StoredKeyring } from '@keystonehq/base-eth-keyring'
import { KeystoneInteractionProvider } from './KeystoneInteractionProvider'
import { TypedTransaction } from '@ethereumjs/tx'
import log from 'electron-log'

export class KeystoneKeyring extends BaseKeyring {
  constructor(opts?: StoredKeyring) {
    super(opts)
  }

  getInteraction = (): KeystoneInteractionProvider => {
    return new KeystoneInteractionProvider()
  }

  signTransaction(address: string, tx:any): Promise<any> {
    console.log("signTransaction", JSON.stringify(tx, (key, value) => {
          // workaround for chain id being a BigInt instead of a BN.
          return typeof value === 'bigint'
              ? Number(value)
              : value// return everything else unchanged
        }
    ));
    return super.signTransaction(address, tx).catch((e) => console.log('signTransaction error', e))
  }

  submitSignature = this.getInteraction().submitSignature
}
