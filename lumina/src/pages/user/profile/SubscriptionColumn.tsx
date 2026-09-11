import { Link } from 'react-router-dom'

const payments = [
  { date: '05-02-2026', pkg: 'Commercial', nominal: 'Rp 750.000', status: 'Done' },
  { date: '18-01-2025', pkg: 'Commercial', nominal: 'Rp 750.000', status: 'Done' },
  { date: '15-01-2024', pkg: 'Commercial', nominal: 'Rp 750.000', status: 'Done' },
  { date: '15-10-2023', pkg: 'Commercial', nominal: 'Rp 750.000', status: 'Done' },
  { date: '17-06-2023', pkg: 'Commercial', nominal: 'Rp 750.000', status: 'Done' },
]

function SubscriptionColumn() {
  return (
    <div className="flex w-full flex-col gap-6 lg:w-[667px] lg:shrink-0 lg:gap-[30px]">
      <section className="rounded-[14px] border border-navy-700/50 bg-navy-800/40 px-5 py-6 sm:px-[30px] lg:py-[30px]">
        <h2 className="text-[20px] font-bold text-white">
          Your Subscription Plan
        </h2>

        <div className="mt-[26px] rounded-[10px] border border-navy-700 bg-navy-950/50 px-5 py-6 sm:px-[42px] lg:py-[32px]">
          <div className="flex items-start justify-between">
            <h3 className="text-[22px] font-bold text-white sm:text-[28px]">Explorer</h3>
            <span className="rounded-full bg-mist-400 px-4 py-1 text-[11px] font-semibold text-navy-900">
              Basic
            </span>
          </div>

          <p className="mt-2 text-[14px] text-mist-200">
            R&D, Academic Research, and Corridor Testing
          </p>

          <div className="mt-[22px] flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-[34px] leading-none font-bold text-white sm:text-[47px]">
              Rp 0
              <span className="ml-1 text-[24px] font-normal">/month</span>
            </p>
            <span className="pb-1 text-[14px] text-mist-200">
              No annual billing commitment
            </span>
          </div>
        </div>

        <p className="mt-[26px] text-[16px] text-white">
          Enhance your services to optimize your analysis process!
        </p>

        <Link
          to="/app/subscription"
          className="mt-[22px] block w-full rounded-lg bg-navy-700 py-3 text-center text-[15px] text-white transition-colors hover:bg-navy-700/70"
        >
          Learn About and Improve Our Services
        </Link>
      </section>

      <section className="rounded-[14px] border border-navy-700/50 bg-navy-800/40 px-5 py-6 sm:px-[30px] lg:py-[28px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-white">Payment History</h2>
          <Link
            to="/app/subscription"
            className="text-[14px] font-medium text-white transition-colors hover:text-mist-200"
          >
            See more
          </Link>
        </div>

        <div className="mt-[22px] overflow-x-auto rounded-lg border border-navy-700">
          <table className="w-full min-w-[420px] border-collapse text-center">
            <thead>
              <tr className="border-b border-navy-700">
                {['Date', 'Package', 'Nominal', 'Status'].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2.5 text-[14px] font-bold text-white"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.date}
                  className="border-b border-navy-700 last:border-b-0"
                >
                  <td className="px-4 py-2.5 text-[14px] font-semibold text-white">
                    {payment.date}
                  </td>
                  <td className="px-4 py-2.5 text-[14px] font-semibold text-white">
                    {payment.pkg}
                  </td>
                  <td className="px-4 py-2.5 text-[14px] font-semibold text-white">
                    {payment.nominal}
                  </td>
                  <td className="px-4 py-2.5 text-[14px] font-semibold text-white">
                    {payment.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SubscriptionColumn
