import { NextPage } from 'next'
import Head from 'next/head'
import { Navbar } from '../components/navbar'
import { useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction, PublicKey } from '@solana/web3.js'
import { gql } from '@apollo/client'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import client from '../client'
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction
} from '@solana/spl-token'
import { NftCard } from '../components/nftCard'
import { send } from 'process'

enum transactionState {
  NONE,
  SENDING,
  DONE
}

const Home: NextPage = () => {
  interface Nft {
    name: string
    address: string
    description: string
    image: string
    mintAddress: string
  }

  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const [nfts, setNfts] = useState<Nft[]>([])
  const [sending, setSending] = useState<Nft[]>([])
  const [to, setTo] = useState('')
  const [txState, setTxState] = useState<transactionState>(
    transactionState.NONE
  )

  const massSend = async (list: Nft[], to: string) => {
    if (!list || !to || !connection || !publicKey || !signTransaction) {
      console.log('returning')
      return
    }

    try {
      console.log('to: ', to)
      new PublicKey(to)
      console.log('valid dest address: ', to)
    } catch (e) {
      toast.error(e.message)
      return
    }

    if (!list.length) {
      console.log('probably want to select some nfts')
      return
    }

    const tx = new Transaction()
    console.log('trying to send ', list.length, ' nfts')
    for (var i = 0; i < list.length; i++) {
      const mintPublicKey = new PublicKey(list[i].mintAddress)
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey
      )
      const fromPublicKey = publicKey
      const destPublicKey = new PublicKey(to)
      const destTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        destPublicKey
      )
      const receiverAccount = await connection.getAccountInfo(destTokenAccount)

      if (receiverAccount === null) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            fromPublicKey,
            destTokenAccount,
            destPublicKey,
            mintPublicKey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
      }

      tx.add(
        createTransferInstruction(
          fromTokenAccount,
          destTokenAccount,
          fromPublicKey,
          1
        )
      )
    }
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = publicKey

    let signed: Transaction | undefined = undefined

    try {
      signed = await signTransaction(tx)
    } catch (e) {
      toast(e.message)
      return
    }

    let signature: string | undefined = undefined

    try {
      signature = await connection.sendRawTransaction(signed.serialize())
      setTxState(transactionState.SENDING)
      await connection.confirmTransaction(signature, 'confirmed')
      setTxState(transactionState.DONE)
      toast.success('Transaction successful')
      // WE HAVE TO REFETCH WALLET DATA HERE
      // for now remove them from the list
      sending.map(n => {
        setNfts(nfts.filter(n => !sending.includes(n)))
      })
      setSending([])
    } catch (e) {
      toast.error(e.message)
    }
  }

  const GET_NFTS = gql`
    query GetNfts($owners: [PublicKey!], $limit: Int!, $offset: Int!) {
      nfts(owners: $owners, limit: $limit, offset: $offset) {
        address
        mintAddress
        name
        description
        image
        owner {
          address
          associatedTokenAccountAddress
        }
      }
    }
  `

  useMemo(() => {
    if (publicKey?.toBase58()) {
      client
        .query({
          query: GET_NFTS,
          variables: {
            owners: [publicKey?.toBase58()],
            offset: 0,
            limit: 200
          }
        })
        .then(res => setNfts(res.data.nfts))
    } else {
      setNfts([])
      setSending([])
      setTo('')
    }
  }, [publicKey?.toBase58()])

  return (
    <div>
      <Head>
        <title>Multi Send</title>
        <meta name='description' content='Send multiple NFTs at once!' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <Navbar sending={sending.length} />

      <div className='container'>
        <div className='grid grid-cols-4 gap-4'>
          {nfts.map(e => (
            <NftCard
              image={e.image}
              name={e.name}
              unselect={() => {
                setSending(sending.filter(item => item !== e))
              }}
              select={() => {
                setSending([...sending, e])
              }}
              selected={sending.includes(e)}
            />
          ))}
        </div>
      </div>

      <footer></footer>
      {/* Send Modal */}
      <input type='checkbox' id='my-modal-3' className='modal-toggle ' />
      <div
        className='modal'
        onBlur={() => {
          console.log('bye bye')
        }}
      >
        <div className='relative modal-box'>
          <label
            htmlFor='my-modal-3'
            className='absolute btn btn-sm btn-circle right-2 top-2'
          >
            ✕
          </label>
          {txState === transactionState.NONE && (
            <>
              <h3 className='text-lg font-bold'>Send the NFS</h3>
              <div>
                {sending.length === 0 && (
                  <h1>Select some nfts to send fren!</h1>
                )}
                {sending.map(s => (
                  <div className='flex flex-row mb-2 border border-white'>
                    <img src={s.image} width={'75px'} />
                    <p>{s.name}</p>
                    <button
                      className='btn'
                      onClick={() => {
                        setSending(sending.filter(item => item !== s))
                      }}
                    >
                      X
                    </button>
                  </div>
                ))}
                <label className='label'>
                  <span className='label-text'>Destination?</span>
                </label>
                <input
                  type='text'
                  className='w-full max-w-xs input input-bordered'
                  placeholder='pubkey address'
                  onChange={e => {
                    setTo(e.target.value)
                  }}
                />
                <div className='modal-action'>
                  <button
                    className='btn btn-primary'
                    onClick={() => {
                      massSend(sending, to)
                    }}
                  >
                    🚀
                  </button>
                </div>
              </div>{' '}
            </>
          )}
          {txState === transactionState.SENDING && (
            <>
              <h1>SPINNNNERRRR.....</h1>
            </>
          )}
          {txState === transactionState.DONE && (
            <>
              <h1>DONE!</h1>
            </>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default Home
