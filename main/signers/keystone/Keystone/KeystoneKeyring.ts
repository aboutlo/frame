import { BaseKeyring, StoredKeyring } from '@keystonehq/base-eth-keyring'
import { KeystoneInteractionProvider } from './KeystoneInteractionProvider'
import log from 'electron-log'

export class KeystoneKeyring extends BaseKeyring {
  constructor(opts?: StoredKeyring) {
    super(opts)
  }

  getInteraction = (): KeystoneInteractionProvider => {
    return new KeystoneInteractionProvider()
  }
  // TODO LS tx should be TypedTransaction type however there are incompatible types between @ethereumjs/tx versions  in Frame and @keystonehq/base-eth-keyring
  signTransaction(address: string, tx:any): Promise<any> {
    log.info('KeystoneKeyring::signTransaction',{address,tx: tx.data.toString('hex')})
    return super.signTransaction(address, tx)
  }

  submitSignature = this.getInteraction().submitSignature
}
