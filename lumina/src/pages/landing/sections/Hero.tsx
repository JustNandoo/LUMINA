import { Clock, Landmark, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import heroBg from '../../../assets/images/landing/Hero.png'
import Button from '../../../components/ui/Button'
import FeatureCard from '../../../components/ui/FeatureCard'

const features = [
  {
    icon: Users,
    title: 'Check Density',
    description: 'Monitor station conditions in real time',
  },
  {
    icon: Clock,
    title: 'Choose the Best Time',
    description: 'Avoid peak hours with these time recommendations',
  },
  {
    icon: Landmark,
    title: 'Discover the Facilities',
    description:
      'Check out the restrooms, ATMs, and other important locations',
  },
]

function Hero() {
  const navigate = useNavigate()

  return (
    <section
      className="flex min-h-svh flex-col bg-navy-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      {/* Kolom setinggi layar: judul di tengah ruang kosong, kartu menempel di
          dasar hero. Tanpa ini, di layar tinggi kartu ikut naik dan separuh
          bawah hero kosong. */}
      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-6 pt-[116px] pb-10 sm:px-10 lg:px-28 lg:pt-[172px] lg:pb-[66px]">
        <div className="flex flex-1 flex-col justify-center">
        <h1 className="max-w-[520px] animate-rise-in text-[32px] sm:text-[40px] lg:text-[52px] leading-[1.12] lg:leading-[1.08] font-bold tracking-[-0.015em] text-white [animation-delay:120ms]">
          Leave at the Right Time
        </h1>

        <p className="mt-6 lg:mt-10 max-w-[400px] animate-rise-in text-[15px] lg:text-[16px] leading-[1.9] lg:leading-[2.2] text-mist-200 [animation-delay:240ms]">
          LUMINA helps you check crowd levels, choose a more convenient travel
          time, view routes, and find nearby amenities—all in one place.
        </p>

        <div className="mt-8 lg:mt-[46px] flex animate-rise-in flex-wrap items-center gap-3 lg:gap-[22px] [animation-delay:360ms]">
          <Button variant="primary" className="min-w-[170px]" onClick={() => navigate('/app/home')}>
            Plan Your Trip
          </Button>
          <Button variant="outline" className="min-w-[170px]" onClick={() => navigate('/features')}>
            Learn More
          </Button>
        </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 lg:mt-[50px] lg:gap-8 xl:gap-[50px]">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              className="animate-rise-in"
              style={{ animationDelay: `${480 + index * 110}ms` }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
