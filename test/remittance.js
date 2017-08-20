let Promise = require('bluebird')
let Remittance = artifacts.require('./Remittance.sol')
let helpers = require('./helpers')
let expectThrow = helpers.expectThrow

if (typeof web3.eth.getAccountsPromise !== 'function') {
    Promise.promisifyAll(web3.eth, { suffix: 'Promise' })
}

contract('Remittance', accounts => {
    let remittance = null
    beforeEach('should deploy a new Remittance contract', async () => {
        remittance = await Remittance.new({ from: accounts[0] })
    })

    it('should disallow empty deposits', async () => {
        await expectThrow( remittance.deposit('abcdefg', 100, { from: accounts[0], value: 0 }) )
    })

    it('should disallow deposits with an empty password', async () => {
        await expectThrow( remittance.deposit(0, 100, { from: accounts[0], value: 100 }) )
    })

    it('should disallow deposits with a deadline block in the past', async () => {
        let blockNumber = await web3.eth.getBlockNumberPromise()
        await expectThrow( remittance.deposit('abcdefg', blockNumber, { from: accounts[0], value: 100 }) )
    })

    describe('when something is deposited', async () => {
        let pw1, pw2, password, blockNumber, depositAmount, tx

        beforeEach(async () => {
            pw1 = web3.sha3('xyzzy')
            pw2 = web3.sha3('foobar')
            password = web3.sha3(pw1.substr(2) + pw2.substr(2), { encoding: 'hex' })
            blockNumber = await web3.eth.getBlockNumberPromise()
            depositAmount = web3.toWei(1, 'ether')

            tx = await remittance.deposit(password, blockNumber + 100, { from: accounts[0], value: depositAmount })
        })

        it('should log the deposit', async () => {
            assert.equal(tx.logs.length, 1, 'Should have gotten 1 event in the log')
            assert.equal(tx.logs[0].event, 'LogReceived', 'Should have gotten a LogReceived event')
            assert.equal(tx.logs[0].args.pwHash, password, `LogReceived event should have the password hash ${password}`)
            assert.equal(tx.logs[0].args.value, web3.toWei(1, 'ether'), 'LogReceived event should have the value 1 ETH')
        })

        it('should reflect the deposit in entriesByHash', async () => {
            let [ depositor, amount, deadlineBlock ] = await remittance.entriesByHash(password)
            assert.equal(depositor, accounts[0], `Depositor should be ${accounts[0]}, got ${depositor}`)
            assert.equal(amount, depositAmount, `Amount should be ${depositAmount}, got ${amount}.`)
            assert.equal(deadlineBlock, blockNumber + 100, `Deadline block should be ${blockNumber + 100}, got ${deadlineBlock}`)
        })

        it('should prevent multiple deposits under the same password hash', async () => {
            await expectThrow(
                remittance.deposit(password, blockNumber + 100, { from: accounts[1], value: web3.toWei(1, 'ether') })
            )
        })

        it('should prevent multiple deposits under the same password hash, even after funds are withdrawn fully', async () => {
            await remittance.withdraw(pw1, pw2, { from: accounts[1] })
            await expectThrow(
                remittance.deposit(password, blockNumber + 100, { from: accounts[1], value: web3.toWei(1, 'ether') })
            )
        })

        it('should allow withdrawals', async () => {
            let prevBalance = await web3.eth.getBalancePromise(accounts[1])

            let tx = await remittance.withdraw(pw1, pw2, { from: accounts[1] })
            let gasPrice = (await web3.eth.getTransactionPromise(tx.tx)).gasPrice
            let totalGasCost = gasPrice.times(tx.receipt.gasUsed)

            let newBalance = await web3.eth.getBalancePromise(accounts[1])

            assert(tx.logs.length === 1, `Expected 1 log, got ${tx.logs.length}`)
            let log = tx.logs[0]

            assert(log.event === 'LogWithdrawal', `Expected LogWithdrawal, got ${log.event}`)
            assert(log.args.to === accounts[1], `LogWithdrawal.args.to should have been ${accounts[1]}, got ${log.args.to}`)
            assert(log.args.value.equals(web3.toWei(1, 'ether')), `LogWithdrawal.args.value should have been ${web3.toWei(1, 'ether')}, got ${log.args.value}`)

            let oneETH = web3.toBigNumber(web3.toWei(1, 'ether'))
            assert(newBalance.minus(prevBalance).equals( oneETH.minus(totalGasCost) ), `Balance is wrong after withdrawal (${newBalance.minus(prevBalance).toString()})`)
        })

        it('should prevent withdrawing more than once', async () => {
            await remittance.withdraw(pw1, pw2, { from: accounts[1] })
            await expectThrow(
                remittance.withdraw(pw1, pw2, { from: accounts[1] })
            )
        })
    })
})


