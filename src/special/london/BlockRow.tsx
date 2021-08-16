import React from "react";
import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { commify, formatEther } from "@ethersproject/units";
import BlockLink from "../../components/BlockLink";
import PercentageBar from "../../components/PercentageBar";
import TimestampAge from "../../components/TimestampAge";
import Blip from "./Blip";
import { ChartBlock } from "./chart";
import { ELASTICITY_MULTIPLIER } from "./params";

type BlockRowProps = {
  now: number;
  block: ChartBlock;
  baseFeeDelta: number;
};

const BlockRow: React.FC<BlockRowProps> = ({ now, block, baseFeeDelta }) => {
  const gasTarget = block.gasLimit.div(ELASTICITY_MULTIPLIER);
  const burntFees = block.gasUsed.mul(block.baseFeePerGas!);
  const netFeeReward = block?.feeReward ?? BigNumber.from(0);
  const gasUsedPerc =
    block && block.gasUsed.mul(10000).div(block.gasLimit).toNumber() / 100;

  return (
    <div className="grid grid-cols-21 gap-x-2 px-3 py-2 hover:bg-gray-100 items-baseline">
      <div className="col-span-2">
        <BlockLink blockTag={block.number} />
      </div>
      <div className="col-span-3 flex space-x-1 justify-end items-baseline">
        <div
          className={`text-right ${
            block.gasUsed.gt(gasTarget)
              ? "text-green-500"
              : block.gasUsed.lt(gasTarget)
              ? "text-red-500"
              : ""
          }`}
        >
          {commify(block.gasUsed.toString())}
        </div>
        <div className="text-right text-gray-400 text-xs truncate">
          {" / "}
          {commify(block.gasLimit.toString())}
        </div>
      </div>
      <div className="col-span-2 text-xs self-center">
        <PercentageBar perc={gasUsedPerc} />
      </div>
      <div className="col-span-2 text-right">
        <div className="relative">
          <span>
            {FixedNumber.from(block.baseFeePerGas)
              .divUnsafe(FixedNumber.from(1e9))
              .round(0)
              .toUnsafeFloat()}{" "}
            <span className="text-xs text-gray-500">Gwei</span>
          </span>
          <Blip value={baseFeeDelta} />
        </div>
      </div>
      <div className="col-span-2 text-right col-span-2">
        {commify(formatEther(block.blockReward))} Ether
      </div>
      <div className="col-span-4 text-right col-span-2 line-through text-orange-500">
        {commify(formatEther(burntFees))} Ether
      </div>
      <div className="col-span-4 text-right col-span-2">
        {commify(formatEther(netFeeReward))} Ether
      </div>
      <div className="col-span-2 text-right text-gray-400 text-sm">
        <TimestampAge now={now / 1000} timestamp={block.timestamp} />
      </div>
    </div>
  );
};

export default React.memo(BlockRow);
