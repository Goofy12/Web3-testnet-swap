import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

type ButtonProps = {
  onClick?: MouseEventHandler<HTMLDivElement>;
  title: string;
  link?: string;
  externalURL?: string;
  children?: ReactNode;
};

const ButtonBright = (props: ButtonProps) => {
  if (props.link && props.link !== '')
    return (
      <Link
        href={props.link}
        title={props.title}
        className="group flex w-fit cursor-pointer flex-nowrap rounded bg-primary-200 px-3 py-1 hover:bg-primary-200"
      >
        <div className="text-black group-hover:text-gray-100">
          {props.title}
        </div>
      </Link>
    );
  if (props.externalURL && props.externalURL !== '')
    return (
      <a
        href={props.externalURL}
        title={props.title}
        target="_blank"
        className="group flex w-fit cursor-pointer flex-nowrap rounded bg-primary-200 px-3 py-1 hover:bg-primary-200"
      >
        <div className="text-black group-hover:text-gray-100">
          {props.title}
        </div>
      </a>
    );
  return (
    <div
      onClick={props.onClick}
      className="group flex w-fit cursor-pointer flex-nowrap rounded bg-primary-200 px-3 py-1 hover:bg-primary-200"
    >
      <div className="text-black group-hover:text-gray-100">{props.title}</div>
    </div>
  );
};

export default ButtonBright;
