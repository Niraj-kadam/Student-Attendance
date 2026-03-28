import React from "react";
import TeacherDashboard from "./TeacherDashboard";

// This page is mounted at /teacher/analytics.
// It renders TeacherDashboard with the analytics tab forced open via the initialTab prop.
const TeacherAnalytics = () => {
  return <TeacherDashboard initialTab="analytics" />;
};

export default TeacherAnalytics;