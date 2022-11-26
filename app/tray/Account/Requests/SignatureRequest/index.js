import React from 'react'
import Restore from 'react-restore'
import { isHexString } from '@ethersproject/bytes'
import { stripHexPrefix } from './../../../../../resources/utils'
import {
  Cluster,
  ClusterBox,
  ClusterColumn,
  ClusterRow,
  ClusterValue
} from '../../../../../resources/Components/Cluster'
import link from '../../../../../resources/link'
import QRSignModal from '../../../../../resources/Components/QRSignModal'

function decodeMessage(rawMessage) {
  if (isHexString(rawMessage)) {
    const buff = Buffer.from(stripHexPrefix(rawMessage), 'hex')
    return buff.length === 32 ? rawMessage : buff.toString('utf8')
  }

  // replace all multiple line returns with just one to prevent excess space in message
  return rawMessage.replaceAll(/[\n\r]+/g, '\n')
}

class TransactionRequest extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = { allowInput: false, dataView: false }

    const props = args[0] || {}

    this.signRefs = [React.createRef(), React.createRef()]

    setTimeout(() => {
      this.setState({ allowInput: true })
    }, props.signingDelay || 1500)
  }

  renderMessage(message) {
    let showMore = false
    if (this.signRefs[0].current && this.signRefs[1].current) {
      const inner = this.signRefs[1].current.clientHeight
      const wrap = this.signRefs[0].current.clientHeight + this.signRefs[0].current.scrollTop
      if (inner > wrap) showMore = true
    }
    return (
      <div ref={this.signRefs[0]} className='signValue'>
        <div ref={this.signRefs[1]} className='signValueInner'>
          {message}
        </div>
        {showMore ? <div className='signValueMore'>scroll to see more</div> : null}
      </div>
    )
  }

  render() {
    const type = this.props.req.type
    const status = this.props.req.status
    const payload = this.props.req.payload

    const message = decodeMessage(payload.params[1])

    const activeAccount = Object.values(this.store('main.accounts')).find(account => account.active).address
    const keystoneSignRequests = this.store('main.keystone.signRequests')
    const keystoneSignRequest = keystoneSignRequests.find(request => request.address === activeAccount)

    let requestClass = 'signerRequest'
    if (status === 'success') requestClass += ' signerRequestSuccess'
    if (status === 'declined') requestClass += ' signerRequestDeclined'
    if (status === 'pending') requestClass += ' signerRequestPending'
    if (status === 'error') requestClass += ' signerRequestError'

    return (
      <div key={this.props.req.id || this.props.req.handlerId} className={requestClass}>
        {type === 'sign' ? (
          <div className='approveRequest'>
            <div className="approveTransactionPayload">{status !== 'pending' && keystoneSignRequest === undefined ? this.renderMessage(message) :
                  <ClusterBox title="QR Signature" style={{width: '100%',}}>
                    <Cluster>
                      <ClusterRow>
                        <ClusterColumn>
                          <ClusterValue pointerEvents={true} style={{padding: '20px'}}>
                            <QRSignModal
                                showModal={status === 'pending' && keystoneSignRequest}
                                signRequest={keystoneSignRequest}
                                submitSignature={(signature) => {
                                  link.rpc('submitKeystoneSignature', signature, () => {
                                  })
                                }}
                                cancelRequestSignature={() => {
                                  // moved to the global cancel button
                                }}
                            />
                          </ClusterValue>
                        </ClusterColumn>

                      </ClusterRow>
                    </Cluster>
                  </ClusterBox>}
            </div>
          </div>
        ) : (
          <div className='unknownType'>{'Unknown: ' + this.props.req.type}</div>
        )}
      </div>
    )
  }
}

export default Restore.connect(TransactionRequest)
