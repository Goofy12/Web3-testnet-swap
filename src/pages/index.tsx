import { Meta } from '@/layouts/Meta';
import { Main } from '@/templates/Main';

const Index = () => {
  return (
    <Main
      meta={
        <Meta title="Toke swap page" description="I simple uniswap clone" />
      }
    >
      <div className="mt-12 flex w-full justify-around border-2 py-2">
        <div className="flex h-32 w-full flex-col rounded border-2 border-primary-100 bg-slate-500 ">
          <div className=" flex h-32 w-full flex-col rounded bg-slate-700">
            <div className="flex justify-between">
              <div> 125.024</div>
              <div> TEST TOKEN</div>
            </div>
            <div className="flex justify-end">
              <div className="p-2">
                Balance: 220 <span className="text-primary-200">Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
};

export default Index;
