import React, { useState, useEffect, useMemo, useContext } from "react";
import { Route, Switch, useParams } from "react-router-dom";
import { BigNumber, ethers } from "ethers";
import StandardFrame from "./StandardFrame";
import StandardSubtitle from "./StandardSubtitle";
import TabGroup from "./components/TabGroup";
import Tab from "./components/Tab";
import Details from "./transaction/Details";
import Logs from "./transaction/Logs";
import erc20 from "./erc20.json";
import { TokenMetas, TokenTransfer, TransactionData } from "./types";
import { RuntimeContext } from "./useRuntime";
import { SelectionContext, useSelection } from "./useSelection";
import { useInternalOperations } from "./useErigonHooks";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type TransactionParams = {
  txhash: string;
};

const Transaction: React.FC = () => {
  const { provider } = useContext(RuntimeContext);
  const params = useParams<TransactionParams>();
  const { txhash } = params;

  const [txData, setTxData] = useState<TransactionData>();
  useEffect(() => {
    if (!provider) {
      return;
    }

    const readBlock = async () => {
      const [_response, _receipt] = await Promise.all([
        provider.getTransaction(txhash),
        provider.getTransactionReceipt(txhash),
      ]);
      const _block = await provider.getBlock(_receipt.blockNumber);
      document.title = `Transaction ${_response.hash} | Otterscan`;

      // Extract token transfers
      const tokenTransfers: TokenTransfer[] = [];
      for (const l of _receipt.logs) {
        if (l.topics.length !== 3) {
          continue;
        }
        if (l.topics[0] !== TRANSFER_TOPIC) {
          continue;
        }
        tokenTransfers.push({
          token: l.address,
          from: ethers.utils.getAddress(
            ethers.utils.hexDataSlice(ethers.utils.arrayify(l.topics[1]), 12)
          ),
          to: ethers.utils.getAddress(
            ethers.utils.hexDataSlice(ethers.utils.arrayify(l.topics[2]), 12)
          ),
          value: BigNumber.from(l.data),
        });
      }

      // Extract token meta
      const tokenMetas: TokenMetas = {};
      for (const t of tokenTransfers) {
        if (tokenMetas[t.token]) {
          continue;
        }
        const erc20Contract = new ethers.Contract(t.token, erc20, provider);
        const [name, symbol, decimals] = await Promise.all([
          erc20Contract.name(),
          erc20Contract.symbol(),
          erc20Contract.decimals(),
        ]);
        tokenMetas[t.token] = {
          name,
          symbol,
          decimals,
        };
      }

      setTxData({
        transactionHash: _receipt.transactionHash,
        status: _receipt.status === 1,
        blockNumber: _receipt.blockNumber,
        transactionIndex: _receipt.transactionIndex,
        confirmations: _receipt.confirmations,
        timestamp: _block.timestamp,
        miner: _block.miner,
        from: _receipt.from,
        to: _receipt.to,
        createdContractAddress: _receipt.contractAddress,
        value: _response.value,
        tokenTransfers,
        tokenMetas,
        type: _response.type ?? 0,
        fee: _response.gasPrice!.mul(_receipt.gasUsed),
        blockBaseFeePerGas: _block.baseFeePerGas,
        maxFeePerGas: _response.maxFeePerGas,
        maxPriorityFeePerGas: _response.maxPriorityFeePerGas,
        gasPrice: _response.gasPrice!,
        gasUsed: _receipt.gasUsed,
        gasLimit: _response.gasLimit,
        nonce: _response.nonce,
        data: _response.data,
        logs: _receipt.logs,
      });
    };
    readBlock();
  }, [provider, txhash]);

  const internalOps = useInternalOperations(provider, txData);
  const sendsEthToMiner = useMemo(() => {
    if (!txData || !internalOps) {
      return false;
    }

    for (const t of internalOps) {
      if (t.to === txData.miner) {
        return true;
      }
    }
    return false;
  }, [txData, internalOps]);

  const selectionCtx = useSelection();

  return (
    <StandardFrame>
      <StandardSubtitle>Transaction Details</StandardSubtitle>
      {txData && (
        <SelectionContext.Provider value={selectionCtx}>
          <TabGroup>
            <Tab href={`/tx/${txhash}`}>Overview</Tab>
            <Tab href={`/tx/${txhash}/logs`}>
              Logs{txData && ` (${txData.logs.length})`}
            </Tab>
          </TabGroup>
          <Switch>
            <Route path="/tx/:txhash/" exact>
              <Details
                txData={txData}
                internalOps={internalOps}
                sendsEthToMiner={sendsEthToMiner}
              />
            </Route>
            <Route path="/tx/:txhash/logs/" exact>
              <Logs txData={txData} />
            </Route>
          </Switch>
        </SelectionContext.Provider>
      )}
    </StandardFrame>
  );
};

export default React.memo(Transaction);
