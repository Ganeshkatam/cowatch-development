import React from "react";
import { Title, Text } from "@mantine/core";
import styles from "./MyRooms.module.css";

export const Hero: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroHeader}>
          <Title order={1} className={styles.heroTitle}>MY ROOMS</Title>
          <Text className={styles.heroSubtitle}>
            All the watch parties you create and manage.
          </Text>
        </div>

        {children && (
          <div className={styles.heroMetrics}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
