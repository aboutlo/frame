import React, { useState, useEffect } from 'react'
import BigNumber from 'bignumber.js'

import { isUnlimited } from '../../../../../resources/utils/numbers'
import svg from '../../../../../resources/svg'
import link from '../../../../../resources/link'
import { ClusterBox, Cluster, ClusterRow, ClusterValue } from '../../../../../resources/Components/Cluster'
import Countdown from '../../../../../resources/Components/Countdown'
import RequestHeader from '../../../../../resources/Components/RequestHeader'
import RequestItem from '../../../../../resources/Components/RequestItem'
import CustomAmountInput from '../../../../../resources/Components/CustomAmountInput'
import TypedSignatureOverview from '../../../../../resources/Components/SimpleTypedData'
import { getSignatureRequestClass } from '../../../../../resources/domain/request'
import useCopiedMessage from '../../../../../resources/Hooks/useCopiedMessage'

const getPermit = (req) => {
  const {
    typedMessage: {
      data: {
        message: { deadline, spender, value, owner, nonce },
        domain: { verifyingContract, chainId, name, version },
        types
      }
    }
  } = req

  return {
    deadline,
    spender,
    value,
    owner,
    verifyingContract,
    chainId,
    name,
    nonce,
    version,
    types
  }
}

const PermitOverview = ({ permit, req, chainData, originName, tokenData }) => {
  const { owner, deadline, spender, value } = permit
  const { chainColor, chainName, icon } = chainData
  const [showCopiedMessage, copySpender] = useCopiedMessage(spender)

  return (
    <div className='approveRequest'>
      <div className='approveTransactionPayload'>
        <div className='_txBody'>
          <ClusterBox animationSlot={1}>
            <RequestItem
              key={`signErc20Permit:${req.handlerId}`}
              req={req}
              account={owner}
              handlerId={req.handlerId}
              i={0}
              title={`${chainName} Token Permit`}
              color={chainColor ? `var(--${chainColor})` : ''}
              img={icon}
              headerMode={true}
            >
              <Cluster>
                <ClusterRow>
                  <ClusterValue
                    onClick={() => {
                      link.send('nav:update', 'panel', {
                        data: { step: 'viewRaw' }
                      })
                    }}
                  >
                    <div className='_txDescription'>
                      <RequestHeader chain={chainName} chainColor={chainColor}>
                        <div className='requestItemTitleSub'>
                          <div className='requestItemTitleSubIcon'>{svg.window(10)}</div>
                          <div className='requestItemTitleSubText'>{originName}</div>
                        </div>
                        <div className='_txDescriptionSummaryMain'>{`Token Permit to Spend ${
                          tokenData.symbol || '??'
                        }`}</div>
                      </RequestHeader>
                    </div>
                  </ClusterValue>
                </ClusterRow>
              </Cluster>
            </RequestItem>
          </ClusterBox>
          <ClusterBox title={'Token Permit'} animationSlot={2}>
            <Cluster>
              {Boolean(tokenData.decimals) && (
                <>
                  <ClusterRow>
                    <ClusterValue
                      pointerEvents={true}
                      onClick={() => {
                        copySpender(spender)
                      }}
                    >
                      <div className='clusterAddress'>
                        <span className='clusterAddressRecipient'>
                          {spender.substring(0, 8)}
                          {svg.octicon('kebab-horizontal', { height: 15 })}
                          {spender.substring(spender.length - 6)}
                        </span>
                        <div className='clusterAddressRecipientFull'>
                          {showCopiedMessage ? (
                            <span>{'Address Copied'}</span>
                          ) : (
                            <span className='clusterFira'>{spender}</span>
                          )}
                        </div>
                      </div>
                    </ClusterValue>
                  </ClusterRow>
                  <ClusterRow>
                    <ClusterValue>
                      <div
                        className='clusterTag'
                        style={{ color: 'var(--moon)' }}
                      >{`is requesting permission to spend`}</div>
                    </ClusterValue>
                  </ClusterRow>
                  <ClusterRow>
                    <ClusterValue
                      onClick={() => {
                        link.send('nav:update', 'panel', {
                          data: {
                            step: 'adjustPermit',
                            tokenData
                          }
                        })
                      }}
                    >
                      <div className='clusterFocus'>
                        <div className='clusterFocusHighlight'>{`${
                          isUnlimited(value)
                            ? '~UNLIMITED'
                            : new BigNumber(value).shiftedBy(-tokenData.decimals)
                        } ${tokenData.symbol || '??'}`}</div>
                      </div>
                    </ClusterValue>
                  </ClusterRow>

                  <ClusterRow>
                    <ClusterValue>
                      <div className='clusterTag'>Permit Expires In</div>
                    </ClusterValue>
                  </ClusterRow>

                  <ClusterRow>
                    <ClusterValue>
                      <Countdown
                        end={deadline * 1000}
                        innerClass='clusterFocusHighlight'
                        titleClass='clusterFocus'
                      />
                    </ClusterValue>
                  </ClusterRow>
                </>
              )}
            </Cluster>
          </ClusterBox>
        </div>
      </div>
    </div>
  )
}

const EditPermit = ({ permit, tokenData, req }) => {
  const {
    verifyingContract: contract,
    spender,
    value: amount,
    deadline: deadlineInSeconds,
    chainId,
    nonce,
    name,
    types,
    owner,
    version
  } = permit

  const updateRequest = (newAmt) => {
    link.rpc(
      'updateRequest',
      req.handlerId,
      {
        message: { deadline: deadlineInSeconds, spender, value: newAmt, owner, nonce },
        domain: { verifyingContract: contract, chainId, name, version },
        types,
        primaryType: 'Permit'
      },
      null,
      () => {}
    )
  }
  const deadline = deadlineInSeconds * 1000

  const requestedAmount = BigNumber(req.payload.params[1].message.value)

  const data = {
    ...tokenData,
    contract,
    spender,
    amount
  }

  return (
    <CustomAmountInput
      {...{
        data,
        requestedAmount,
        updateRequest,
        deadline
      }}
    />
  )
}

const PermitRequest = ({ req, originName, step, chainData }) => {
  const [tokenData, setTokenData] = useState({})
  const permit = getPermit(req)

  useEffect(() => {
    link.rpc('getErc20Data', permit.verifyingContract, permit.chainId, (err, tokenData) => {
      if (err) return console.error(err)
      setTokenData(tokenData)
    })
  }, [])

  const requestClass = getSignatureRequestClass(req)

  const renderStep = () => {
    switch (step) {
      case 'adjustPermit':
        return (
          <EditPermit
            {...{
              tokenData,
              permit,
              req
            }}
          />
        )
      case 'viewRaw':
        return <TypedSignatureOverview {...{ originName, req }} />
      default:
        return (
          <PermitOverview
            {...{
              originName,
              tokenData,
              permit,
              req,
              chainData
            }}
          />
        )
    }
  }

  return (
    <div key={req.id || req.handlerId} className={requestClass}>
      {renderStep()}
    </div>
  )
}

export default PermitRequest
