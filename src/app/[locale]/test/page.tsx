import {  fts } from "@/lib/db"
function bigIntReplacer(_key: string, value: any): any {
  return typeof value === 'bigint' ? value.toString() : value;
}
async function TestPage() {
  const results = await fts('来');
  console.log(results);
  return (
    <div>
      <h1>Test Page</h1>
      <pre>{JSON.stringify(results, bigIntReplacer, 2)}</pre>
    </div>
  )
}
export default TestPage