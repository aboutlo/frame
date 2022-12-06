import React from 'react'
import Restore from 'react-restore'

import link from '../../../../../../resources/link'

// New Tx
import TxMain from './TxMain'
import TxMainNew from './TxMainNew'
import TxFeeNew from './TxFeeNew'
import TxAction from './TxAction'
import TxRecipient from './TxRecipient'
import AdjustFee from './AdjustFee'
import ViewData from './ViewData'
import TxApproval from './TxApproval'
import TokenSpend from './TokenSpend'

class TransactionRequest extends React.Component {
  constructor (props, context) {
    super(props, context)
    this.state = { allowInput: false, dataView: false, showHashDetails: false }

    setTimeout(() => {
      this.setState({ allowInput: true })
    }, props.signingDelay || 1500)
  }

  overlayMode (mode) {
    this.setState({ overlayMode: mode })
  }

  allowOtherChain () {
    this.setState({ allowOtherChain: true })
  }

  renderAdjustFee () {
    const { accountId, handlerId } = this.props
    const req = this.store('main.accounts', accountId, 'requests', handlerId)
    return (
      <AdjustFee req={req} />
    )
  }

  renderTokenSpend () {
    const crumb = this.store('windows.panel.nav')[0] || {}
    const { actionId, requestedAmountHex } = crumb.data
    const { accountId, handlerId } = this.props
    const req = this.store('main.accounts', accountId, 'requests', handlerId)
    if (!req) return null
    const approval = (req.recognizedActions || []).find(action => action.id === actionId)
    if (!approval) return null
    return (
      <TokenSpend
        approval={approval}
        requestedAmountHex={requestedAmountHex}
        updateApproval={(amount) => {
          link.rpc('updateRequest', handlerId, actionId, { amount }, () => {})
        }}
      />
    )
  }

  renderViewData () {
    return (
      <ViewData {...this.props} />
    )
  }

  renderTx () {
    const { accountId, handlerId } = this.props
    const req = this.store('main.accounts', accountId, 'requests', handlerId)
    if (!req) return null
    const originalNotice = (req.notice || '').toLowerCase()

    const activeAccount = Object.values(this.store('main.accounts')).find(account => account.active).address
    const signRequests = this.store('main.keystone.signRequests')
    const signRequest = signRequests.find(request => request.address === activeAccount)

    const status = req.status
    const mode = req.mode
    let requestClass = 'signerRequest'
    const success = (req.status === 'confirming' || req.status === 'confirmed')
    const error = req.status === 'error' || req.status === 'declined'
    if (success) requestClass += ' signerRequestSuccess'
    if (req.status === 'confirmed') requestClass += ' signerRequestConfirmed'
    else if (error) requestClass += ' signerRequestError'

    const chain = {
      type: 'ethereum',
      id: parseInt(req.data.chainId, 'hex')
    }

    const insufficientFundsMatch = originalNotice.includes('insufficient funds')
    if (insufficientFundsMatch) {
      notice = originalNotice.includes('for gas') ? 'insufficient funds for gas' : 'insufficient funds'
    }

    const txMeta = { replacement: false, possible: true, notice: '' }
    // TODO
    // if (signer locked) {
    //   txMeta.possible = false
    //   txMeta.notice = 'signer is locked'
    // }
    if (mode !== 'monitor' && req.data.nonce) {
      const r = this.store('main.accounts', this.props.accountId, 'requests')
      const requests = Object.keys(r || {}).map(key => r[key])
      const monitor = requests.filter(req => req.mode === 'monitor')
      const monitorFilter = monitor.filter(r => r.status !== 'error')
      const existingNonces = monitorFilter.map(m => m.data.nonce)
      existingNonces.forEach((nonce, i) => {
        if (req.data.nonce === nonce) {
          txMeta.replacement = true
          if (monitorFilter[i].status === 'confirming' || monitorFilter[i].status === 'confirmed') {
            txMeta.possible = false
            txMeta.notice = 'nonce used'
          } else if (
            req.data.gasPrice &&
            parseInt(monitorFilter[i].data.gasPrice, 'hex') >= parseInt(req.data.gasPrice, 'hex')
          ) {
            txMeta.possible = false
            txMeta.notice = 'gas price too low'
          } else if (
              req.data.maxPriorityFeePerGas &&
              req.data.maxFeePerGas &&
              Math.ceil(parseInt(monitorFilter[i].data.maxPriorityFeePerGas, 'hex') * 1.1) > parseInt(req.data.maxPriorityFeePerGas, 'hex') &&
              Math.ceil(parseInt(monitorFilter[i].data.maxFeePerGas, 'hex') * 1.1) > parseInt(req.data.maxFeePerGas, 'hex')
            ) {
            txMeta.possible = false
            txMeta.notice = 'gas fees too low'
          }
        }
      })
    }

    let nonce = parseInt(req.data.nonce, 'hex')
    if (isNaN(nonce)) nonce = 'TBD'

    const showWarning = !status && mode !== 'monitor'
    const requiredApproval = showWarning && (req.approvals || []).filter(a => !a.approved)[0]

    const recognizedActions = req.recognizedActions || []
    return (
      <div key={req.handlerId} className={requestClass}>
        {req.type === 'transaction' ? (
          <div className='approveTransaction'>
            {!!requiredApproval ? (
              <TxApproval
                req={this.props.req}
                approval={requiredApproval}
                allowOtherChain={this.allowOtherChain.bind(this)} />
            ) : null}
            <div className='approveTransactionPayload'>
              <div className='_txBody'>
                <TxMainNew i={0} {...this.props} req={req} chain={chain} />
                <TxMain i={1} {...this.props} req={req} chain={chain} />
                {recognizedActions.map((action, i) => {
                  return <TxAction key={'action' + action.type + i} i={2 + i} {...this.props} req={req} chain={chain} action={action} />
                })}
                <TxRecipient i={3 + recognizedActions.length} {...this.props} req={req} />
                <TxFeeNew i={4 + recognizedActions.length} {...this.props} req={req} />
              </div>
              <QRSignModal
                  showModal={status === 'pending' && signRequest}
                  signRequest={signRequest}
                  submitSignature={(signature) => {
                    link.rpc('submitKeystoneSignature', signature, () => {})
                  }}
                  cancelRequestSignature={() => {
                    link.rpc('cancelKeystoneRequestSignature', signRequest.request.requestId, () => {})
                    this.decline(req)
                  }}
              />
            </div>
          </div>
        ) : (
          <div className='unknownType'>{'Unknown: ' + req.type}</div>
        )}
      </div>
    )
  }
  render () {
    const { step } = this.props
    if (step === 'adjustFee') {
      return this.renderAdjustFee()
    } else if (step === 'adjustApproval') {
      return this.renderTokenSpend()
    } else if (step === 'viewData') {
      return this.renderViewData()
    } else if (step === 'confirm') {
      return this.renderTx()
    } else {
      return step
    }
  }
}

export default Restore.connect(TransactionRequest)
