pragma solidity ^0.4.13;

contract Ownable {
    address owner;

    function Owned() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
}

contract Splitter is Ownable
{
    mapping(address => uint) public funds;

    event LogDeposit(address indexed depositor, address indexed one, address indexed two, uint oneValue, uint twoValue);
    event LogWithdrawal(address who, uint amount);

    function deposit(address one, address two)
        payable
        returns (bool ok)
    {
        require(msg.value > 0);
        require(one != 0);
        require(two != 0);

        uint oneValue = msg.value / 2;
        uint twoValue = oneValue;
        if (msg.value % 2 == 1) oneValue++; // two gets shafted if the value is odd

        funds[one] += oneValue;
        funds[two] += twoValue;

        LogDeposit(msg.sender, one, two, oneValue, twoValue);
        return true;
    }

    function withdraw()
        returns (bool ok)
    {
        require(funds[msg.sender] > 0);

        uint amount = funds[msg.sender];
        funds[msg.sender] = 0;

        msg.sender.transfer(amount);

        LogWithdrawal(msg.sender, amount);
        return true;
    }

    function kill()
        onlyOwner
        returns (bool ok)
    {
        selfdestruct(owner);
        return true;
    }
}