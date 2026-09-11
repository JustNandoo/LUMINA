import TopBar from '../../../components/layout/TopBar'
import AccountSettingsColumn from './AccountSettingsColumn'
import SubscriptionColumn from './SubscriptionColumn'

function Profile() {
  return (
    <>
      <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-[52px] lg:pt-[38px] lg:pb-[40px]">
        <div className="animate-rise-in relative z-30">
          <TopBar showSearch={false} />
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:mt-[36px] lg:flex-row lg:gap-[26px]">
          <div className="flex flex-1 animate-rise-in [animation-delay:100ms]">
            <AccountSettingsColumn />
          </div>

          <div className="animate-rise-in [animation-delay:200ms]">
            <SubscriptionColumn />
          </div>
        </div>
      </div>
    </>
  )
}

export default Profile
