export const metadata = {
  title: '订单管理 - 猫咪打印机',
  description: '查看和管理所有订单',
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="orders-layout">
      {children}
    </div>
  )
}
