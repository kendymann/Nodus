interface NodusLogoProps {
  className?: string;
  isAnimating?: boolean;
}

export function NodusLogo({ className = '', isAnimating = false }: NodusLogoProps) {
  const pathClass = isAnimating ? 'animate-nodus-trace' : '';
  
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 417 403" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_d_6_72)">
        <path 
          d="M18.51 238.106C23.8007 232.789 30.5322 232.554 36.3914 237.482C40.079 240.54 41.7128 245.085 43.8774 258.816C52.1649 309.149 71.9949 334.122 116.13 349.396C131.271 354.708 157.556 359.455 178.018 360.334C197.856 361.411 206.135 363.245 209.439 367.378C213.838 372.711 208.579 378.914 197.293 381.432C173.259 386.873 118.639 385.063 86.7856 377.679C34.1236 365.535 8.71317 331.552 9.00244 273.485C9.05378 250.827 10.3665 246.179 18.51 238.106Z" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2"
          className={pathClass}
        />
        <path 
          d="M76.2607 15.1257C88.2812 10.1899 108.145 11.6357 122.311 18.2721C155.511 33.7525 177.64 62.6943 236.129 166.432C285.357 254.329 305.614 285.715 325.398 303.565C336.652 314.106 343.493 316.719 350.57 313.62C360.641 308.989 365.624 289.561 368.005 245.502C368.703 234.306 370.076 229.977 374.669 224.349C382.207 215.767 385.687 215.645 394.684 223.888C402.101 230.522 402.109 230.761 403.607 254.955C406.363 296.458 398.237 331.924 380.942 354.159C369.271 369.066 360.712 373.406 345.859 372.023C322.926 369.971 297.307 347.094 266.986 301.801C257.806 288.334 250.206 276.475 250.181 275.763C250.154 275.048 247.154 270.162 243.477 264.588C240.016 259.004 234.475 249.928 231.223 244.098C191.476 172.035 159.718 116.807 151.699 105.438C124.679 67.397 98.6227 50.7156 82.0088 61.2792C70.5062 68.5745 58.3361 100.378 51.658 139.834C46.9575 167.334 44.1852 175.274 36.5474 181.008C30.1895 185.984 22.7048 183.632 16.7192 174.333C13.4924 169.216 12.8911 164.482 13.3069 145.213C14.581 81.9374 39.9656 29.4671 76.2607 15.1257Z" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2"
          className={pathClass}
        />
        <path 
          d="M233.233 3.111C255.376 -2.41426 305.752 -0.335302 335.156 7.41105C383.768 20.1528 407.333 55.3361 407.29 115.288C407.33 138.681 406.137 143.475 398.659 151.778C393.8 157.248 387.593 157.466 382.171 152.356C378.758 149.185 377.235 144.485 375.186 130.3C367.349 78.2998 348.965 52.4387 308.204 36.4985C294.221 30.9552 269.962 25.9532 251.088 24.9672C232.79 23.7785 225.147 21.853 222.084 17.5734C218.007 12.0497 222.835 5.66745 233.233 3.111Z" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2"
          className={pathClass}
        />
      </g>
      <defs>
        <filter id="filter0_d_6_72" x="0" y="0" width="416.291" height="402.589" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="9"/>
          <feGaussianBlur stdDeviation="4.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_6_72"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_6_72" result="shape"/>
        </filter>
      </defs>
    </svg>
  );
}

