import Head from 'next/head'
import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import { query, mutate, tx, reauthenticate } from "@onflow/fcl";


export default function Home() {

  const [user, setUser] = useState({loggedIn: null})
  const [name, setName] = useState('') // NEW
  const [balance, setBalance] = useState('') // NEW
  const [txid, getTxid] = useState('') // NEW
  const [txstatus, txStatus] = useState('') // NEW

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

	// NEW
  const sendQuery = async () => {
    const profile = await fcl.query({
      cadence: `
        import Profile from 0xProfile

        pub fun main(address: Address): Profile.ReadOnly? {
          return Profile.read(address)
        }
      `,
      args: (arg, t) => [arg(user.addr, t.Address)]
    })
  
  
    setName(profile?.name ?? 'No Profile')
  }



  //GET BALANCE
  const getFlowBalance = async (address) => {
    const cadence = `
      import FlowToken from 0xFLOW
      import FungibleToken from 0xFT
  
      pub fun main(address: Address): UFix64 {
        let account = getAccount(address)
  
        let vaultRef = account.getCapability(/public/flowTokenBalance)
          .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
          ?? panic("Could not borrow Balance reference to the Vault")
  
        return vaultRef.balance
      }
    `;
    const args = (arg, t) => [arg(user.addr, t.Address)];
    const balance = await query({ cadence, args });
    setBalance(balance ?? 'NA')
  }

  const sendFlow = async (recepient, amount) => {
    const cadence = `
      import FungibleToken from 0xFT
      import FlowToken from 0xFLOW
  
      transaction(recepient: Address, amount: UFix64){
        prepare(signer: AuthAccount){
          let sender = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow Provider reference to the Vault")
  
          let receiverAccount = getAccount(recepient)
  
          let receiver = receiverAccount.getCapability(/public/flowTokenReceiver)
            .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
            ?? panic("Could not borrow Receiver reference to the Vault")
  
                  let tempVault <- sender.withdraw(amount: amount)
          receiver.deposit(from: <- tempVault)
        }
      }
    `;
  
    const test = 0x5623da46a9780741
    const args = (arg, t) => [arg(recepient, user.addr), arg(amount, t.UFix64)];
    const limit = 500;
  
    const txId = await mutate({ cadence, args, limit });
  
      console.log("Waiting for transaction to be sealed...");
  
      const txDetails = await tx(txId).onceSealed();
    console.log({ txDetails });
  }





  const AuthedState = () => {
    return (
      <div>
        <div>Address: {user?.addr ?? "No Address"}</div>
        <div>Profile Name: {name ?? "--"}</div> {/* NEW */}
        <div>Balance: {balance ?? "--"}</div> {/* NEW */}
        <div>TX Status: {txstatus ?? "--"}</div> {/* NEW */}
        <div>TXID: {txid ?? "--"}</div> {/* NEW */}
        <button onClick={getFlowBalance}>get balance</button> {/* NEW */}
        <button onClick={sendQuery}>Get Profile Name</button> {/* NEW */}
        <button onClick={sendFlow}>Send Transaction</button> {/* NEW */}

        <button onClick={fcl.unauthenticate}>Log Out</button>
      </div>
    )
  }

  const UnauthenticatedState = () => {
    return (
      <div>
        <button onClick={fcl.logIn}>Log In</button>
        <button onClick={fcl.signUp}>Sign Up</button>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>FCL Quickstart with NextJS</title>
        <meta name="description" content="My first web3 app on Flow!" />
        <link rel="icon" href="/favicon.png" />
      </Head>
      <h1>Flow App</h1>
      {user.loggedIn
        ? <AuthedState />
        : <UnauthenticatedState />
      }
    </div>
  );




(async () => {
  console.clear();
    // "reauthenticate" will ensure your session works properly
  // and present you a popup to sign in
  await reauthenticate();

  // This is an example account we've created to this exibition
  // You can replace it with one of your addresses
  const recepient = "0x3e68d80ca405bbac";

  // Check "initial" balance first
  await getFlowBalance(recepient);

  // Send some FLOW tokens to Recepient
  await sendFlow(recepient, "1.337");

  // Ensure that Recepient's balance has been changed
  await getFlowBalance(recepient);
})();

}