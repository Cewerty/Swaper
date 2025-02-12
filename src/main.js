import TokenJSON from '../artifacts/contracts/token.sol/Token.json' with { type: 'json' };
import SwaperJSON from '../artifacts/contracts/swaper.sol/Swaper.json' with { type: 'json' };
import { BrowserProvider, Contract, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';

const tokenAbi = TokenJSON.abi;
const swaperAbi = SwaperJSON.abi;

// Конфигурация контрактов
const contractAddresses = {
  tokenA: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  tokenB: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  swaper: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
};

const elements = {
    data: {
      reserve: {
        tokenA: document.getElementById("tokenAReserve"),
        tokenB: document.getElementById("tokenBReserve")
      },
      balance: {
        tokenA: document.getElementById("tokenABalance"),
        tokenB: document.getElementById("tokenBBalance")
      }
    },
    reserve: {
        form: document.getElementById("addReserve"),
        inputs: {
            first: document.getElementById("firstTokenAmount"),
            second: document.getElementById("secondTokenAmount")
        }
    },
    swap: {
        form: document.getElementById("swapForm"),
        inputs: {
            amount: document.getElementById("swapAmount"),
            isTokenA: document.getElementById("isTokenA")
        }
    },
    buy: {
      form: document.getElementById("buyToken"),
      inputs: {
        amount: document.getElementById("tokenAmount"),
        isTokenA: document.getElementById("isTokenAToBuy")
      }
    }
}


let signer = null;
let provider = null;
let userAddress = null;

let tokenA = null;
let tokenB = null;
let swaper = null;

const checkAndApprove = async (tokenContract, amount) => {
  const currentAllowance = await tokenContract.allowance(userAddress, contractAddresses.swaper);
  console.log(currentAllowance);
  if (currentAllowance < amount) {
      const tx = await tokenContract.approve(
          contractAddresses.swaper,
          amount,
          { gasLimit: 500000 } 
      );
      await tx.wait(); 
      return true;
  }
  return false;
};

async function updateData() {
   elements.data.balance.tokenA.innerText = formatUnits(await tokenA.balanceOf(userAddress));
   elements.data.balance.tokenB.innerText = formatUnits(await tokenB.balanceOf(userAddress));
   elements.data.reserve.tokenA.innerText = formatUnits(await swaper.tokenAReserve());
   elements.data.reserve.tokenB.innerText = formatUnits(await swaper.tokenBReserve());
}


async function init() {
  try {
    if (!window.ethereum) {
      alert('Пожалуйста, установите MetaMask!');
      return;
    }

    provider = new BrowserProvider(window.ethereum);
    
    const network = await provider.getNetwork();
    console.log('Connected to network:', network.name, network.chainId);

    const accounts = await provider.send("eth_requestAccounts", []);
    
    if (accounts.length === 0) {
      throw new Error('Аккаунты не обнаружены');
    }

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    console.log('Успешная инициализация:', {
      userAddress,
      provider,
      signer
    });
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    alert(`Ошибка: ${error.message}`);
  }
}

window.addEventListener('load', async () => {
  try {
    await init();
    await initializeContracts();
  } catch (error) {
    console.error('Ошибка при загрузке:', error);
  }
});

// Инициализация контрактов
async function initializeContracts() {
  try {
    if (!provider || !signer) {
      throw new Error('Провайдер не инициализирован');
    }

     tokenA = new Contract(
      contractAddresses.tokenA,
      tokenAbi,
      signer
    );

     tokenB = new Contract(
      contractAddresses.tokenB,
      tokenAbi,
      signer
    );

     swaper = new Contract(
      contractAddresses.swaper,
      swaperAbi,
      signer
    );

    await updateData();

    console.log('Контракты инициализированы:', { tokenA, tokenB, swaper });

  } catch (error) {
    console.error('Ошибка инициализации контрактов:', error);
  }
}

elements.reserve.form.addEventListener('submit', async (event) => {
  event.preventDefault();
    try {
        const tokenAAmountBN = parseUnits(elements.reserve.inputs.first.value.trim(), 18);
        const tokenBAmountBN = parseUnits(elements.reserve.inputs.second.value.trim(), 18);
        
        const [balanceA, balanceB] = await Promise.all([
            tokenA.balanceOf(userAddress),
            tokenB.balanceOf(userAddress)
        ]);
    
        console.log(balanceA);
        console.log(balanceB);
    
        if ((balanceA < tokenAAmountBN) || (balanceB < tokenBAmountBN)) {
            alert("Not anougth tokens for add")
            return;
        }
    
        await Promise.all([
            checkAndApprove(tokenA, tokenAAmountBN),
            checkAndApprove(tokenB, tokenBAmountBN)
        ]);

        const balanceABefore = formatUnits(await swaper.tokenAReserve(), 18);
        const balanceBBefore = formatUnits(await swaper.tokenBReserve(), 18);
        console.log("Balances before: ", balanceABefore);
        console.log(balanceBBefore);

        const tx = await swaper.addReserve(tokenAAmountBN, tokenBAmountBN);
        const receipt = await tx.wait();
        if (receipt.status === 0){
            alert("Transfer failed")
            return;
        }

        const balanceAAfter = formatUnits(await swaper.tokenAReserve(), 18);
        const balanceBAfter = formatUnits(await swaper.tokenBReserve(), 18);
        console.log("Balances after: ", balanceAAfter);
        console.log(balanceBAfter);

        await updateData();
    
    } catch (error) {
        console.error(error.message);        
    }
});



elements.swap.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const swapAmountBN = parseUnits(elements.swap.inputs.amount.value.trim(), 18);
    const isTokenA = elements.swap.form.isTokenA.checked;
    const userBalance = isTokenA ? await tokenA.balanceOf(userAddress) : await tokenB.balanceOf(userAddress);
    if (swapAmountBN > userBalance) {
      alert("Not enought tokens for swap");
      return;
    }
    if (isTokenA) {
      await checkAndApprove(tokenA, swapAmountBN);
    }
    else {
      await checkAndApprove(tokenB, swapAmountBN);
    }
    const tx = await swaper.swap(swapAmountBN, isTokenA);
    const receipt = await tx.wait();
    if (receipt.status === 0) {
      alert('Swap failed');
      return;
    }

    await updateData();
  } catch (error) {
    console.error(error.message);
  }
})

elements.buy.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const tokenAmount = parseEther(elements.buy.inputs.amount.value.trim(), 18);
    const isTokenA = elements.buy.inputs.isTokenA.checked;
    const userBalance = isTokenA ? await tokenA.balanceOf(userAddress) : await tokenB.balanceOf(userAddress);

    if (tokenAmount > userBalance) {
      alert("Not anought eth for buy");
      return;
    }
    
    const tx = await swaper.buyTokens(isTokenA, {value:tokenAmount, gasLimit:50_000});
    const receipt = await tx.wait();

    const userBalanceAfter = isTokenA ? await tokenA.balanceOf(userAddress) : await tokenB.balanceOf(userAddress);

    console.log("Balance before: ", userBalance);
    console.log("Balance after: ", userBalanceAfter);

    if (receipt.status === 0) {
      alert("Buy failed");
      return;
    }

    await updateData();

  } catch (error) {
    console.error(error.message);
  }
});