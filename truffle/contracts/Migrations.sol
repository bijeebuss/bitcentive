pragma solidity ^0.4.4;


import { Ownable } from "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Migrations is Ownable {
    uint public last_completed_migration;

    function setCompleted(uint _completed) onlyOwner {
        last_completed_migration = _completed;
    }

    function upgrade(address _newAddress) onlyOwner {
        Migrations upgraded = Migrations(_newAddress);
        upgraded.setCompleted(last_completed_migration);
    }
}
