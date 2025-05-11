import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>猫猫打印系统</h1>
        <p>一站式猫咪打印解决方案</p>
      </div>

      <div className={styles.grid}>
        <Link href="/orders" className={styles.card}>
          <h2>订单管理</h2>
          <p>查看、创建和管理订单</p>
        </Link>

        <Link href="/printers" className={styles.card}>
          <h2>打印机管理</h2>
          <p>配置和管理打印设备</p>
        </Link>

        <Link href="/dishes" className={styles.card}>
          <h2>菜品管理</h2>
          <p>查看和编辑菜品信息</p>
        </Link>

        <Link href="/settings" className={styles.card}>
          <h2>系统设置</h2>
          <p>配置系统参数和选项</p>
        </Link>
      </div>
    </main>
  );
} 