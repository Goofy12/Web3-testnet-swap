import React from 'react';

// import { useAccount, useBalance, useNetwork } from 'wagmi';
import { Meta } from '@/layouts/Meta';
import { Main } from '@/templates/Main';

const Index = () => {
  const [input, setInput] = React.useState(125);
  const [balance, setBalance] = React.useState(220);
  // const { address, isConnecting, isDisconnected } = useAccount();
  // const { chain } = useNetwork();
  // const { data, isError, isLoading } = useBalance({
  //   address,
  // });
  // React.useEffect(() => {

  // });

  return (
    <Main
      meta={
        <Meta title="Toke swap page" description="I simple uniswap clone" />
      }
    >
      <div className="mt-12 flex w-full flex-col justify-around rounded bg-gray-300 py-2">
        <div className="flex justify-start px-4">
          <div className="text-primary-300">Swap Tokens</div>
        </div>
        <div className="relative flex h-auto w-full flex-col rounded">
          <div className="group absolute left-24 top-1/3 flex h-12 w-12 items-center justify-center rounded bg-gray-300 hover:bg-gray-300">
            <div className=" rounded bg-gray-200 px-3 py-1 text-gray-300 group-hover:text-gray-100 ">
              ^
            </div>
          </div>
          <div className=" my-2 mx-4 flex h-32 justify-between rounded bg-gray-100">
            <div className="flex flex-col items-center justify-evenly px-4 py-2">
              {/* <div className="text-4xl"> 125.024</div> */}
              <input
                className={
                  'w-full bg-gray-100 text-4xl focus:outline-none active:border-0'
                }
                type="text"
                value={input}
                onChange={(evt: { target: { value: number | string } }) => {
                  const result = evt.target.value;
                  setInput(parseFloat(`${result}`));
                  setBalance(parseFloat(`${result}`));
                }}
                onBlur={(evt: { target: { value: number | string } }) => {
                  console.log('>>> on blur event:', { evt });
                  if (evt.target.value === '') {
                    setInput(0);
                  }
                  const result = parseFloat(`${evt.target.value}`);
                  console.log('>>> on blur event result:', { result });
                  if (result > balance) {
                    setInput(parseFloat(parseFloat(`${balance}`).toFixed(3)));
                  } else if (result < 0) {
                    setInput(0);
                  } else if (Number.isNaN(result)) {
                    setInput(0);
                  } else {
                    setInput(parseFloat(result.toFixed(3)));
                  }
                }}
              />
            </div>
            <div className="flex min-w-[192px] flex-col items-start justify-evenly">
              <div className="p-2"> TEST TOKEN</div>
              <div className="p-2">
                Balance: 220 <span className="text-primary-300">Max</span>
              </div>
            </div>
          </div>
          <div className=" my-2 mx-4 flex h-32 justify-between rounded bg-gray-100">
            <div className="flex flex-col items-center justify-evenly px-4 py-2">
              <div className="text-4xl"> 125.024</div>
            </div>
            <div className="flex min-w-[192px] flex-col items-start justify-evenly">
              <div className="p-2"> TEST TOKEN</div>
              <div className="p-2">
                Balance: 220 <span className="text-primary-300">Max</span>
              </div>
            </div>
          </div>
          <div className="my-2 w-full px-4">
            <div className="group my-2 flex items-center justify-center rounded border-2 border-primary-200 bg-primary-200 px-4 py-2 hover:bg-gray-300">
              <div className="text-lg text-black group-hover:text-primary-200">
                Swap Now
              </div>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
};

export default Index;
