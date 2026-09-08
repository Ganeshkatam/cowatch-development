import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import styles from "./NotFound.module.css";

export const NotFound = () => {
  return (
    <div className={styles.container}>
      <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowMid} />
      
      <div className={styles.content}>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Lost in Space</h2>
        <p className={styles.subtitle}>
          This page is off script. We couldn't find the room or page you were looking for.
        </p>
        
        <Button 
          component={Link} 
          to="/" 
          size="md" 
          variant="gradient" 
          gradient={{ from: 'violet', to: 'pink' }}
          leftSection={<IconArrowLeft size={18} />}
          style={{ marginTop: '8px' }}
        >
          Return Home
        </Button>
      </div>
    </div>
  );
};
