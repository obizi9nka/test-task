// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IinvestPool {

    struct RoleSettingsSetter {
        uint256 roleNumber;
        uint256 startTime;
        uint256 deadline;
        uint256 roleFee;
        uint256 maxAmountToSellForRole;
    }
    
    struct ConstructorParams {
        address _LPtoken;
        address _rolesContract;
        address _paymentToken;
        address _fundrisingWallet;
        uint256 _baseFee;
        uint256 _price;
        uint256 _maxAmountToSell;
        address _manager;
        RoleSettingsSetter[] _roleSettings;
    }

}