import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import { CrudApp } from '../target/types/crud_app'

describe('crud_app', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.CrudApp as Program<CrudApp>

  const crud_appKeypair = Keypair.generate()

  it('Initialize CrudApp', async () => {
    // await program.methods
    //   .initialize()
    //   .accounts({
    //     crud_app: crud_appKeypair.publicKey,
    //     payer: payer.publicKey,
    //   })
    //   .signers([crud_appKeypair])
    //   .rpc()

    // const currentCount = await program.account.cocrud - appetch(crud_appKeypair.publicKey)

    // expect(currentCount.count).toEqual(0)
  })

  it('Increment CrudApp', async () => {
    //   await program.methods.increment().accounts({ cocrud- appcrud_appKeypair.publicKey }).rpc()

    // const currentCount = await program.account.councrud - appch(crud_appKeypair.publicKey)

    // expect(currentCount.count).toEqual(1)
  })

  it('Increment CrudApp Again', async () => {
    //   await program.methods.increment().accounts({ crud- app: crud_appKeypair.publicKey }).rpc()

    // const currentCount = await program.account.crud - app.fetch(crud_appKeypair.publicKey)

    // expect(currentCount.count).toEqual(2)
  })

  it('Decrement CrudApp', async () => {
    //   await program.methods.decrement().accounts({ crud- app: crud_appKeypair.publicKey }).rpc()

    // const currentCount = await program.account.crud - app.fetch(crud_appKeypair.publicKey)

    // expect(currentCount.count).toEqual(1)
  })

  it('Set crud_app value', async () => {
    //   await program.methods.set(42).accounts({ crud- app: crud_appKeypair.publicKey }).rpc()

    // const currentCount = await program.account.cocrud - appetch(crud_appKeypair.publicKey)

    // expect(currentCount.count).toEqual(42)
  })

  it('Set close the crud_app account', async () => {
    //   await program.methods
    //     .close()
    //     .accounts({
    //       payer: payer.publicKey,
    //       crud- app: crud_appKeypair.publicKey,
    //     })
    //   .rpc()

    // // The account should no longer exist, returning null.
    // const userAccount = await program.account.crud - app.fetchNullable(crud_appKeypair.publicKey)
    // expect(userAccount).toBeNull()
  })
})
