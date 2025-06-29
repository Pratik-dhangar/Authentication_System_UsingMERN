import React from "react";
import { assets } from "../assets/assets";

const Header = () => {
  return (
    <div className="flex flex-col items-center mt-20 px-4 text-center text-gray-800">
      <img
        src={assets.header_img}
        alt=""
        className="w-36 h-36 rounded-full mb-6"
      />
      <h1 className="flex items-center gap-2 text-xl sm:text-3xl font-medium mb-2">
        Hey Developer{" "}
        <img src={assets.hand_wave} alt="" className="w-8 aspect-square" />
      </h1>
      <h2>Welcome To Our App</h2>
      <p>
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quasi aliquid
        doloremque sapiente tempore porro consequuntur et est, temporibus.
      </p>
      <button>Get Started</button>
    </div>
  );
};

export default Header;
