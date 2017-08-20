pragma solidity ^0.4.13;

contract Remittance
{
    struct Entry {
        address depositor;
        uint funds;
        uint deadlineBlock;
    }

    mapping(bytes32 => Entry) public entriesByHash;

    event LogReceived(bytes32 pwHash, uint value);
    event LogWithdrawal(address indexed to, uint value);

    function withdraw(bytes32 pw1Hash, bytes32 pw2Hash)
        public
        returns (bool ok)
    {
        bytes32 pwHash = keccak256(pw1Hash, pw2Hash);

        Entry storage entry = entriesByHash[pwHash];
        require(entry.funds > 0);

        if (entry.depositor == msg.sender) {
            require(entry.deadlineBlock < block.number);
        } else {
            require(entry.deadlineBlock >= block.number);
        }

        uint funds = entry.funds;

        // don't zero out the entire struct.  we want to be able to ensure
        // passwords are never used twice, so we leave some data in the
        // entriesByHash mapping even after funds are withdrawn (see below).
        entry.funds = 0;

        msg.sender.transfer(funds);

        LogWithdrawal(msg.sender, funds);
        return true;
    }

    function deposit(bytes32 pwHash, uint deadlineBlock)
        payable
        public
        returns (bool ok)
    {
        require(msg.value > 0);
        require(pwHash != 0);
        require(deadlineBlock > block.number);

        // disallow password reuse (see above comment in withdraw() function)
        require(entriesByHash[pwHash].depositor == 0);

        entriesByHash[pwHash] = Entry({
            depositor: msg.sender,
            funds: msg.value,
            deadlineBlock: deadlineBlock
        });

        LogReceived(pwHash, msg.value);
        return true;
    }

}
