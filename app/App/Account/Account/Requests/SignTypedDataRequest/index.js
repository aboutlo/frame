import React from 'react'
import Restore from 'react-restore'
import {
  Cluster,
  ClusterBox,
  ClusterColumn,
  ClusterRow,
  ClusterValue
} from '../../../../../../resources/Components/Cluster'
import link from '../../../../../../resources/link'
import QRSignModal from '../../../../../../resources/Components/QRSignModal'

const SimpleJSON = ({ json }) => {
  return (
    <div className='simpleJson'>
      {Object.keys(json).map((key, o) => (
        <div key={key + o} className='simpleJsonChild'>
          <div className='simpleJsonKey'>{key}:</div>
          <div className='simpleJsonValue'>
            {typeof json[key] === 'object' ? <SimpleJSON json={json[key]} key={key} /> : json[key]}
          </div>
        </div>
      ))}
    </div>
  )
}

class TransactionRequest extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = { allowInput: false, dataView: false }

    const props = args[0] || {}

    setTimeout(() => {
      this.setState({ allowInput: true })
    }, props.signingDelay || 1500)
  }

  render() {
    const { req } = this.props
    const type = req.type
    const status = req.status
    const payload = req.payload
    const typedData = payload.params[1] || {}
    const originName = this.store('main.origins', req.origin, 'name')

    let requestClass = 'signerRequest'
    if (status === 'success') requestClass += ' signerRequestSuccess'
    if (status === 'declined') requestClass += ' signerRequestDeclined'
    if (status === 'pending') requestClass += ' signerRequestPending'
    if (status === 'error') requestClass += ' signerRequestError'

    const activeAccount = Object.values(this.store('main.accounts')).find(account => account.active).address
    const keystoneSignRequests = this.store('main.keystone.signRequests')
    const keystoneSignRequest = keystoneSignRequests.find(request => request.address === activeAccount)

    const messageToSign = typedData.domain ? (
      <div className='signTypedData'>
        <div className='signTypedDataInner'>
          <div className='signTypedDataSection'>
            <div className='signTypedDataTitle'>Domain</div>
            <SimpleJSON json={typedData.domain} />
          </div>
          <div className='signTypedDataSection'>
            <div className='signTypedDataTitle'>Message</div>
            <SimpleJSON json={typedData.message} />
          </div>
        </div>
      </div>
    ) : (
      <div className='signTypedData'>
        <div className='signTypedDataInner'>
          <div className='signTypedDataSection'>
            <SimpleJSON
              json={typedData.reduce((data, elem) => {
                data[elem.name] = elem.value
                return data
              }, {})}
            />
          </div>
        </div>
      </div>
    )

    console.log('render SignTypedDataRequest', {status})
    return (
      <div key={this.props.req.id || this.props.req.handlerId} className={requestClass}>
        {type === 'signTypedData' ? (
            <div className="approveRequest">
              {status !== 'pending' && keystoneSignRequest === undefined ? <div className="approveTransactionPayload">
                <>
                  <div className="requestMeta">
                    <div className="requestMetaOrigin">{originName}</div>
                  </div>
                  {messageToSign}
                </>
                }
              </div> :
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
        ) : (
          <div className='unknownType'>{'Unknown: ' + this.props.req.type}</div>
        )}
      </div>
    )
  }
}

export default Restore.connect(TransactionRequest)
