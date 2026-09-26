const JOOBLE_API_KEY = '3d313a07-493c-45d5-8f56-f1297be4becf';

async function test() {
  console.log('--- Testing Jooble Cuttack vs Odisha ---');
  try {
    const resCuttack = await fetch('https://jooble.org/api/' + JOOBLE_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: 'Content Writer', location: 'Cuttack, India' })
    });
    const dataCuttack = await resCuttack.json();
    console.log('Jooble Cuttack totalCount:', dataCuttack.totalCount, 'returned jobs:', dataCuttack.jobs?.length);

    const ADZUNA_APP_ID = 'f71c360f';
    const ADZUNA_APP_KEY = '35c05fb4ecb0dde8713f1402aa6232ad';

    console.log('\n--- Testing Adzuna Jodhpur vs Rajasthan ---');
    const adzJod = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=20&what=Legal&where=Jodhpur`);
    const dAdzJod = await adzJod.json();
    console.log('Adzuna Jodhpur count:', dAdzJod.count, 'results:', dAdzJod.results?.length);

    const adzRaj = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=20&what=Legal&where=Rajasthan`);
    const dAdzRaj = await adzRaj.json();
    console.log('Adzuna Rajasthan count:', dAdzRaj.count, 'results:', dAdzRaj.results?.length);
    if (dAdzRaj.results?.length > 0) {
      console.log('Sample Adzuna Rajasthan:', dAdzRaj.results[0].title, 'at', dAdzRaj.results[0].company?.display_name, 'in', dAdzRaj.results[0].location?.display_name);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
test();
