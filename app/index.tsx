/* app/index.tsx */
import * as _React from "react"; // FIXED: Underscore prefix clears "React is never used" linter warning
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/welcome" />;
}