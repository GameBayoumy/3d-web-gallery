import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
    return (
        <div className="navbar bg-base-100">
            <div className="flex-1">
                <a rel="noreferrer" target="_blank" href="https://www.tudelft.nl/"><img height="50" width="60" src="../public/tu-delft.png" alt="TU Delft logo" className="mx-5" /></a>
            </div>
            <div className="flex-none">
                <a href="https://ibisdev.tech/#contact-us" className="btn btn-primary btn-xs md:btn-sm">Contact us</a>
            </div>
        </div>
    )
}