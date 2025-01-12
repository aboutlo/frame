import React from 'react'
import Restore from 'react-restore'

// New Tx
import TxMain from './TxMainNew'
import TxValue from './TxValue'
import TxFee from './TxFee'
import TxAction from './TxAction'
import TxRecipient from './TxRecipient'
import AdjustFee from './AdjustFee'
import ViewData from './ViewData'
import TokenSpend from './TokenSpend'
import link from '../../../../../resources/link'

class TransactionRequest extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.state = { allowInput: false, dataView: false, showHashDetails: false }

    setTimeout(() => {
      this.setState({ allowInput: true })
    }, props.signingDelay || 1500)
  }

  overlayMode(mode) {
    this.setState({ overlayMode: mode })
  }

  allowOtherChain() {
    this.setState({ allowOtherChain: true })
  }

  renderAdjustFee() {
    const { req } = this.props
    return <AdjustFee req={req} />
  }

  renderTokenSpend() {
    const crumb = this.store('windows.panel.nav')[0] || {}
    const { actionId, requestedAmountHex } = crumb.data
    const { req } = this.props
    const { handlerId } = req
    if (!req) return null
    const approval = (req.recognizedActions || []).find((action) => action.id === actionId)
    if (!approval) return null
    return (
      <TokenSpend
        approval={approval}
        requestedAmountHex={requestedAmountHex}
        updateApproval={(amount) => {
          link.rpc('updateRequest', handlerId, { amount }, actionId, () => {})
        }}
      />
    )
  }

  renderViewData() {
    return <ViewData {...this.props} />
  }

  renderTx() {
    const { req } = this.props
    if (!req) return null

    let requestClass = 'signerRequest cardShow'
    const success = req.status === 'confirming' || req.status === 'confirmed'
    const error = req.status === 'error' || req.status === 'declined'
    if (success) requestClass += ' signerRequestSuccess'
    if (req.status === 'confirmed') requestClass += ' signerRequestConfirmed'
    else if (error) requestClass += ' signerRequestError'

    const chain = {
      type: 'ethereum',
      id: parseInt(req.data.chainId, 'hex')
    }

    const recognizedActions = req.recognizedActions || []

    return (
      <div key={req.handlerId} className={requestClass}>
        {req.type === 'transaction' ? (
          <div className='approveTransaction'>
            <div className='approveTransactionPayload'>
              <div className='_txBody'>
                <TxMain i={0} {...this.props} req={req} chain={chain} />
                <TxValue i={1} {...this.props} req={req} chain={chain} />
                {recognizedActions.map((action, i) => {
                  return (
                    <TxAction
                      key={'action' + action.type + i}
                      i={2 + i}
                      {...this.props}
                      req={req}
                      chain={chain}
                      action={action}
                    />
                  )
                })}
                <TxRecipient i={3 + recognizedActions.length} {...this.props} req={req} />
                <TxFee i={4 + recognizedActions.length} {...this.props} req={req} />
              </div>
            </div>
          </div>
        ) : (
          <div className='unknownType'>{'Unknown: ' + req.type}</div>
        )}
      </div>
    )
  }
  render() {
    const { step } = this.props
    switch (step) {
      case 'adjustFee':
        return this.renderAdjustFee()
      case 'adjustApproval':
        return this.renderTokenSpend()
      case 'viewData':
        return this.renderViewData()
      case 'confirm':
        return this.renderTx()
      default:
        return step
    }
  }
}

export default Restore.connect(TransactionRequest)
