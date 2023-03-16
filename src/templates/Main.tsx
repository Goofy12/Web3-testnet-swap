import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppConfig } from '@/utils/AppConfig';

import AccountNav from '../components/AccountNav';

type IMainProps = {
  meta: ReactNode;
  children: ReactNode;
};

const Main = (props: IMainProps) => (
  <div className="h-screen w-full bg-default-pattern bg-cover bg-center px-1 text-gray-700 antialiased">
    {props.meta}

    <div className="mx-auto max-w-screen-lg">
      <header>
        <nav>
          <ul className="flex flex-nowrap justify-between py-4 text-xl">
            <li className="mr-6">
              <Link
                href="/"
                className="border-none font-pixel text-primary-200 hover:text-primary-300"
              >
                Home
              </Link>
            </li>
            <li className="mr-6">
              <AccountNav />
            </li>
          </ul>
        </nav>
      </header>

      <main className="content py-5 text-xl">{props.children}</main>

      <footer className="border-t border-gray-300 py-8 text-center text-sm">
        © Copyright {new Date().getFullYear()} {AppConfig.title}. Made with{' '}
        <a href="https://creativedesignsguru.com">CreativeDesignsGuru</a>.
        {/*
         * PLEASE READ THIS SECTION
         * I'm an indie maker with limited resources and funds, I'll really appreciate if you could have a link to my website.
         * The link doesn't need to appear on every pages, one link on one page is enough.
         * For example, in the `About` page. Thank you for your support, it'll mean a lot to me.
         */}
      </footer>
    </div>
  </div>
);

export { Main };
