// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.28;

import './token.sol';

contract Swaper {

    address public immutable owner;
    uint256 public tokenAReserve;
    uint256 public tokenBReserve;
    IERC20 tokenA;
    IERC20 tokenB;

    event Swap(address indexed swaper, bool indexed isTokenA, uint256 amount);
    event Initialized(address indexed initializer, uint256 tokenReserve);
    event ReserveAdded(address indexed sender, uint256 tokenAmount);
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, bool indexed isTokenA);

    constructor(address tokenAAddress, address tokenBAddress) {
        owner = msg.sender;
        tokenA = IERC20(tokenAAddress);
        tokenB = IERC20(tokenBAddress);
    }

    function initialize(uint256 initialTokensReserve) external {
        require(msg.sender == owner, "Only owner");
        require(tokenAReserve == 0, "Already initialized");

        require(
            tokenA.balanceOf(owner) >= initialTokensReserve,
            "Not enough Token A"
        );
        require(
            tokenB.balanceOf(owner) >= initialTokensReserve,
            "Not enough Token B"
        );

        require(
            tokenA.transferFrom(owner, address(this), initialTokensReserve),
            "Token A transfer failed"
        );
        require(
            tokenB.transferFrom(owner, address(this), initialTokensReserve),
            "Token B transfer failed"
        );

        tokenAReserve = initialTokensReserve;
        tokenBReserve = initialTokensReserve;

        emit Initialized(address(this), initialTokensReserve);
    }

    function addReserve(uint256 _tokenAAmount, uint256 _tokenBAmount) public returns(bool success) {
        require(msg.sender == owner, "Only owner can add tokens to the contract");
        
        require(tokenA.transferFrom(msg.sender, address(this), _tokenAAmount), "Token transfer failed");
        require(tokenB.transferFrom(msg.sender, address(this), _tokenBAmount), "Token transfer failed");

        tokenAReserve += _tokenAAmount;
        tokenBReserve += _tokenBAmount;

        return true;
    }

    function swap(uint256 _tokenAmount, bool isTokenA) public returns(bool success) {
        if (isTokenA) {
            require(tokenA.balanceOf(msg.sender) >= _tokenAmount, "Not anought tokens for swap");
            require(tokenBReserve >= _tokenAmount, "Not anought tokens in reserve for swap");
        }
        else {
            require(tokenB.balanceOf(msg.sender) >= _tokenAmount, "Not anought tokens for swap");
            require(tokenAReserve >= _tokenAmount, "Not anought tokens in reserve for swap");
        }

        if (isTokenA) {
            tokenAReserve -= _tokenAmount;
            tokenBReserve += _tokenAmount;
            require(tokenA.transferFrom(msg.sender, address(this), _tokenAmount), "Token transfer failed");
            require(tokenB.transfer(msg.sender, _tokenAmount), "Tokens transfer failed");
        } else {
            tokenBReserve -= _tokenAmount;
            tokenAReserve += _tokenAmount;
            require(tokenB.transferFrom(msg.sender, address(this), _tokenAmount), "Token transfer failed");
            require(tokenA.transfer(msg.sender, _tokenAmount), "Tokens transfer failed");
        }
        emit Swap(msg.sender, isTokenA, _tokenAmount);
        return true;
    }

    function buyTokens(bool isTokenA) public payable returns(bool success) {
        require(msg.value > 0, "Zero ETH sent");
        require(msg.sender.balance >= msg.value, "Not enought tokens");
        if (isTokenA) {
            require(tokenAReserve >= msg.value, "Not enought token in reserve for sell");
        }
        else {
            require(tokenBReserve >= msg.value, "Not enought token in reserve for sell");
        }

        uint amount = msg.value;

        if (isTokenA) {
            tokenAReserve -= amount;
            require(tokenA.transfer(msg.sender, amount), "Tokens transfer failed");
        } else {
            tokenBReserve -= amount;
            require(tokenB.transfer(msg.sender, amount), "Tokens transfer failed");
        }

        return true;
    }
   
}