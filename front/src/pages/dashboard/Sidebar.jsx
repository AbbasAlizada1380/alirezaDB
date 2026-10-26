// Sidebar.js (Fully Responsive Version)

import React, { useState, useEffect } from "react";
import { FaBuilding, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { signOutSuccess } from "../../state/userSlice/userSlice";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { MdLocalShipping, MdPayments } from "react-icons/md";
import { FaMapMarkedAlt } from "react-icons/fa";
import { HiOutlineTruck } from "react-icons/hi";
import { LuUserPlus } from "react-icons/lu";
import { BsCurrencyDollar } from "react-icons/bs";

import { MdAddBox } from "react-icons/md";

import { MdOutlineDashboardCustomize } from "react-icons/md";
import { LucideUserRoundPlus } from "lucide-react";
import { FaList } from "react-icons/fa";
import { MdAddShoppingCart } from "react-icons/md";
const BRAND = import.meta.env.VITE_BRAND_NAME;
const Sidebar = ({ setActiveComponent, setIsMobileOpen, isMobileOpen }) => {
  const [selectedC, setSelectedC] = useState("home");
  const [activeC, setActiveC] = useState("home");
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const MySwal = withReactContent(Swal);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSignOut = () => {
    MySwal.fire({
      title: "آیا مطمئن هستید؟",
      text: "شما از سیستم خارج خواهید شد!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "بله، خارج شو!",
      cancelButtonText: "لغو",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(signOutSuccess());
        navigate("/sign-in");
      }
    });
  };

  const AllComponents = [
    {
      name: "صفحه اصلی",
      value: "home",
      icon: <MdOutlineDashboardCustomize />,
    },
    // {
    //   name: "بسته جدید",
    //   value: "Packages",
    //   icon: <MdAddBox />,
    // },
    
    {
      name: "سفارشات ",
      value: "order",
      icon: <HiOutlineTruck />,
    },    
    {
      name: "مشتری ها",
      value: "Customers",
      icon: <FaMapMarkedAlt />,
    },
    {
      name: "مصارف",
      value: "ExpenseManager",
      icon: <MdPayments />,
    },
    {
      name: "سهام داران",
      value: "holders",
      icon: <FaList />,
    },
    {
      name: "معاشات",
      value: "ُSalaries",
      icon: <BsCurrencyDollar />,
    },
    {
      name: "ثبت کاربر جدید",
      value: "AddUser",
      icon: <LuUserPlus />,
    },
    {
      name: "خروج",
      value: "signout",
      icon: <FaSignOutAlt />,
    },
  ];

  let accessibleComponents = [];

  if (currentUser && currentUser.role) {
    const userRole = currentUser.role;

    if (userRole === "admin") {
      accessibleComponents = AllComponents;
    } else if (userRole === "reception") {
      const receptionAllowedValues = [
        "home",
        "Orders",
        "OrdersList",
        "signout",
      ];
      accessibleComponents = AllComponents.filter((component) =>
        receptionAllowedValues.includes(component.value)
      );
    } else {
      accessibleComponents = AllComponents.filter(
        (component) => component.value === "signout"
      );
    }
  } else {
    accessibleComponents = AllComponents.filter(
      (component) =>
        component.value === "Orders" || component.value === "signout"
    );
  }

  const handleComponentClick = (componentValue) => {
    if (componentValue !== "signout") {
      setActiveComponent(componentValue);
      setSelectedC(componentValue);
      setActiveC(componentValue);
    }

    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleSignOutClick = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
    handleSignOut();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="lg:hidden fixed  inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          h-full transition-all duration-300 ease-in-out 
        bg-primary
          overflow-y-auto
          ${
            isMobile
              ? `fixed top-0 left-0 z-50 transform ${
                  isMobileOpen ? "translate-x-0" : "-translate-x-full"
                } w-64`
              : "w-64 relative"
          }
          shadow-xl
        `}
      >
        {/* Desktop Header */}
        {!isMobile && (
          <header className="flex items-center gap-x-1 px-1 text-white font-bold text-xl sticky top-0  z-10">
            <div className="flex items-center justify-center p-1  rounded-full">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-20 w-20 rounded-full"
              />
            </div>
            <span className="text-2xl font-semibold text-amber-500 whitespace-nowrap">
         {BRAND}
            </span>
          </header>
        )}

        {/* Navigation Items */}
        <ul className={`mr-1 px-3 ${isMobile ? "mt-5" : "mt-0"} `}>
          {AllComponents.map((component, index) => (
            <li key={index} className="relative group cursor-pointer mb-1">
              {component.value === "signout" ? (
                <button
                  onClick={handleSignOutClick}
                  className={`relative flex items-center cursor-pointer w-full px-4 py-2.5 transition-all duration-300 rounded-md
                    hover:transform hover:scale-105
                    ${
                      activeC === component.value
                        ? "bg-red-500 text-white font-semibold shadow-md"
                        : "hover:bg-red-500 hover:bg-opacity-20 text-white hover:text-white"
                    }`}
                >
                  <span className="text-xl transform transition-transform duration-300 group-hover:scale-110">
                    {component.icon}
                  </span>
                  <span className="mr-3 text-md font-semibold whitespace-nowrap">
                    {component.name}
                  </span>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-md bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              ) : (
                <button
                  onClick={() => handleComponentClick(component.value)}
                  onMouseEnter={() => setActiveC(component.value)}
                  onMouseLeave={() => setActiveC(selectedC)}
                  className={`relative flex items-center w-full cursor-pointer px-4 py-2.5 transition-all duration-300 rounded-md
                    hover:transform hover:scale-105
                    ${
                      activeC === component.value
                        ? "bg-gray-200 text-[#0F3A76] shadow-md font-semibold"
                        : "hover:bg-gray-200 hover:bg-opacity-20 text-white hover:text-white"
                    }`}
                >
                  <span className="text-xl transform transition-transform duration-300 group-hover:scale-110">
                    {component.icon}
                  </span>
                  <span className="mr-3 text-md font-semibold whitespace-nowrap">
                    {component.name}
                  </span>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* User Info Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 border-t-2 border-gray-200">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {currentUser?.fullname || "کاربر"}
              </p>
              <p className="text-cyan-200 text-xs truncate">
                {currentUser?.role === "admin"
                  ? "مدیر سیستم"
                  : currentUser?.role === "reception"
                  ? "پذیرش"
                  : "کاربر"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile padding spacer */}
      {isMobile && <div className="lg:hidden h-16" />}
    </>
  );
};

export default Sidebar;
