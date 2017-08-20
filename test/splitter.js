let Promise = require('bluebird')
let Splitter = artifacts.require('./Splitter.sol')
let helpers = require('./helpers')
let expectThrow = helpers.expectThrow

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

contract('Splitter', accounts => {
    let splitter = null
    beforeEach('should deploy a new Splitter contract', async () => {
        splitter = await Splitter.new({ from: accounts[0] })
    })

    it('should disallow empty deposits', async () => {
        await expectThrow( splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: 0 }) )
    })

    it('should disallow deposits to empty addresses', async () => {
        await expectThrow( splitter.deposit(0, accounts[2], { from: accounts[0], value: 1 }) )
        await expectThrow( splitter.deposit(accounts[1], 0, { from: accounts[0], value: 1 }) )
    })

    it('should emit one event (LogDeposit) with correct values when .deposit is called', async () => {
        let value = 4
        let expected1Value = 2
        let expected2Value = 2

        let tx = await splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: value })

        assert(tx.logs.length === 1, `expected 1 log, emitted ${tx.logs.length}`)

        let log = tx.logs[0]
        assert(log.event === 'LogDeposit', `expected LogDeposit, emitted ${log.event}`)
        assert(log.args.depositor === accounts[0], `LogDeposit.depositor should have been ${accounts[0]}, got ${log.args.depositor}`)
        assert(log.args.one === accounts[1], `LogDeposit.one should have been ${accounts[1]}, got ${log.args.one}`)
        assert(log.args.two === accounts[2], `LogDeposit.two should have been ${accounts[2]}, got ${log.args.two}`)
        assert(log.args.oneValue.equals(expected1Value), `LogDeposit.oneValue should have been ${expected1Value}, got ${log.args.oneValue.toString()}`)
        assert(log.args.twoValue.equals(expected2Value), `LogDeposit.twoValue should have been ${expected2Value}, got ${log.args.twoValue.toString()}`)
    })

    it('should register the correct amount of funds after an even-numbered deposit', async () => {
        let value = 4
        let expected1Value = 2
        let expected2Value = 2

        let tx = await splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: value })
        let account1Funds = await splitter.funds(accounts[1])
        let account2Funds = await splitter.funds(accounts[2])

        assert(account1Funds.equals(expected1Value), `Account 1 should have ${expected1Value} wei, got ${account1Funds.toString()}`)
        assert(account2Funds.equals(expected2Value), `Account 2 should have ${expected2Value} wei, got ${account2Funds.toString()}`)
    })

    it('should register the correct amount of funds after an odd-numbered deposit', async () => {
        let value = 5
        let expected1Value = 3
        let expected2Value = 2

        let tx = await splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: value })
        let account1Funds = await splitter.funds(accounts[1])
        let account2Funds = await splitter.funds(accounts[2])

        assert(account1Funds.equals(expected1Value), `Account 1 should have ${expected1Value} wei, got ${account1Funds.toString()}`)
        assert(account2Funds.equals(expected2Value), `Account 2 should have ${expected2Value} wei, got ${account2Funds.toString()}`)
    })

    it('should disallow withdrawals to addresses without funds', async () => {
        await expectThrow( splitter.withdraw({ from: accounts[3] }) )
    })

    it('should emit one event (LogWithdrawal) with correct values when .withdraw is called', async () => {
        let value = 4
        let expected1Value = 2

        await splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: value })
        let tx = await splitter.withdraw({ from: accounts[1] })

        assert(tx.logs.length === 1, `expected 1 event, got ${tx.logs.length}`)
        let log = tx.logs[0]
        assert(log.event === 'LogWithdrawal', `expected LogWithdrawal, emitted ${log.event}`)
        assert(log.args.who === accounts[1], `LogWithdrawal.who should have been ${accounts[1]}, got ${log.args.who}`)
        assert(log.args.amount.equals(expected1Value), `LogWithdrawal.amount should have been ${expected1Value}, got ${log.args.amount.toString()}`)
    })

    it('should correctly withdraw to addresses who are owed funds', async () => {
        let value = 4
        let withdrawValue = 2

        await splitter.deposit(accounts[1], accounts[2], { from: accounts[0], value: value })

        for (let i of [1, 2]) {
            let oldBalance = web3.eth.getBalance(accounts[i]) // we need this to test whether the final balance after withdrawal is correct

            // make sure the contracts reports the correct amount of ETH available for withdrawal
            let withdrawableFunds = await splitter.funds(accounts[i])
            assert(withdrawableFunds.equals(withdrawValue), `accounts[${i}] should have ${withdrawValue} available for withdrawal`)

            // figure out total gas cost so we can determine the correct balance after withdrawal
            let tx = await splitter.withdraw({ from: accounts[i] })
            let gasPrice = (await web3.eth.getTransactionPromise(tx.tx)).gasPrice
            let totalGasCost = gasPrice.times(tx.receipt.gasUsed)

            withdrawableFunds = await splitter.funds(accounts[i])
            assert(withdrawableFunds.equals(0), `accounts[${i}] should have 0`)

            let newBalance = web3.eth.getBalance(accounts[i])
            assert(newBalance.equals( oldBalance.plus(withdrawValue).minus(totalGasCost) ), `Final balance is wrong (${newBalance.toString()})`)
        }
    })
})


