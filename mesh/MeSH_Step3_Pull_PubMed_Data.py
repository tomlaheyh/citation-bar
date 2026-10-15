import os
import csv
import time
import random
from datetime import datetime, timedelta
from tqdm import tqdm
import concurrent.futures
from Bio import Entrez

# Set your email for Entrez (required by NCBI)
Entrez.email = "tomlaheyh" + chr(64) + "gmail.com"  # Your email for NCBI

def search_pubmed_biopython(mesh_term, start_date, end_date, api_key=None):
   """
   Search PubMed for a MeSH term within the specified date range using BioPython.
   Returns the count of publications.
   """
   # Set API key if provided
   if api_key:
       Entrez.api_key = api_key
   
   # Small random delay to be nice to the server
   time.sleep(random.uniform(0.3, 0.5))
   
   # Format the query
   query = f'"{mesh_term}"[MeSH Terms] AND ("{start_date}"[Date - Publication] : "{end_date}"[Date - Publication])'
   
   # Make the request with retries
   max_retries = 5
   for attempt in range(max_retries):
       try:
           # Use BioPython's Entrez module to search PubMed
           handle = Entrez.esearch(db="pubmed", term=query, retmax=0)
           record = Entrez.read(handle)
           handle.close()
           return int(record["Count"])
       except Exception as e:
           if attempt < max_retries - 1:
               # Exponential backoff with randomness
               sleep_time = (2 ** attempt) + random.uniform(0.5, 1.5)
               print(f"Error querying '{mesh_term}'. Retrying in {sleep_time:.1f}s... ({e})")
               time.sleep(sleep_time)
           else:
               print(f"Failed to query '{mesh_term}' after {max_retries} attempts: {e}")
               return -1  # Return -1 to indicate error

def process_term(term, start_date, end_date, prior_year_dates, api_key):
   """
   Process a single MeSH term and return the results.
   Used as a worker function for parallel processing.
   """
   result = {'UI': term['UI'], 'Name': term['Name']}
   
   # Get current date range count
   count = search_pubmed_biopython(term['Name'], start_date, end_date, api_key)
   result['Count'] = count
   result['DateRange'] = f"{start_date}-{end_date}"
   
   # Get prior year count if requested
   if prior_year_dates:
       prior_start_date, prior_end_date = prior_year_dates
       prior_count = search_pubmed_biopython(term['Name'], prior_start_date, prior_end_date, api_key)
       result['PriorYearCount'] = prior_count
       result['PriorYearDateRange'] = f"{prior_start_date}-{prior_end_date}"
   
   return result

def create_chunked_file_name(base_path, chunk_num):
   """Create a filename for a chunk"""
   base_name, ext = os.path.splitext(base_path)
   return f"{base_name}_chunk{chunk_num}{ext}"

def process_mesh_terms_parallel(input_file, output_file, start_date, end_date, 
                              include_prior_year=False, api_key=None, test_mode=False,
                              max_workers=3, chunk_size=10000):
   """
   Process MeSH terms from input CSV in parallel and save counts to chunked output CSVs.
   """
   # Read input CSV
   with open(input_file, 'r', encoding='utf-8') as csv_in:
       reader = csv.DictReader(csv_in)
       all_terms = list(reader)
   
   # Limit to 100 terms if in test mode
   if test_mode:
       print(f"TEST MODE: Processing only 100 terms out of {len(all_terms)}")
       all_terms = all_terms[:100]
   else:
       print(f"Processing {len(all_terms)} MeSH terms...")
   
   # Calculate date range for prior year if needed
   prior_year_dates = None
   if include_prior_year:
       # MODIFIED SECTION: Use direct year replacement instead of timedelta
       # Parse current dates
       current_year = start_date.split('/')[0]
       prior_year = str(int(current_year) - 1)
       
       # Replace year in start and end dates
       prior_start_date = start_date.replace(current_year, prior_year)
       prior_end_date = end_date.replace(current_year, prior_year)
       
       prior_year_dates = (prior_start_date, prior_end_date)
       print(f"Prior year date range: {prior_start_date} to {prior_end_date}")
   
   # Prepare fieldnames for output
   fieldnames = ['UI', 'Name', 'Count', 'DateRange']
   if include_prior_year:
       fieldnames.extend(['PriorYearCount', 'PriorYearDateRange'])
   
   # Divide into chunks
   chunks = [all_terms[i:i + chunk_size] for i in range(0, len(all_terms), chunk_size)]
   num_chunks = len(chunks)
   print(f"Divided into {num_chunks} chunks of {chunk_size} terms each")
   
   # Use a conservative number of workers
   suggested_workers = min(max_workers, 3)
   print(f"Using {suggested_workers} parallel workers")
   print(f"Each chunk will be saved to a separate file")
   
   chunk_files = []
   
   # Process each chunk
   for chunk_idx, chunk in enumerate(chunks):
       chunk_num = chunk_idx + 1
       chunk_file = create_chunked_file_name(output_file, chunk_num)
       chunk_files.append(chunk_file)
       
       print(f"\nProcessing chunk {chunk_num}/{num_chunks} - {len(chunk)} terms")
       print(f"Results will be saved to: {chunk_file}")
       
       results = []
       
       # Process terms in parallel
       with concurrent.futures.ThreadPoolExecutor(max_workers=suggested_workers) as executor:
           # Create a dict of futures to terms
           future_to_term = {
               executor.submit(
                   process_term, term, start_date, end_date, prior_year_dates, api_key
               ): term for term in chunk
           }
           
           # Process as they complete with a progress bar
           for future in tqdm(concurrent.futures.as_completed(future_to_term), total=len(chunk)):
               try:
                   result = future.result()
                   results.append(result)
               except Exception as exc:
                   term = future_to_term[future]
                   print(f"Term {term['Name']} generated an exception: {exc}")
       
       # Write results to file
       with open(chunk_file, 'w', newline='', encoding='utf-8') as csv_out:
           writer = csv.DictWriter(csv_out, fieldnames=fieldnames)
           writer.writeheader()
           
           # Sort results by UI to maintain order
           results.sort(key=lambda x: x['UI'])
           
           for result in results:
               writer.writerow(result)
               
       # Add a pause between chunks to be extra safe
       if chunk_idx < len(chunks) - 1:
           pause_time = random.uniform(5, 10)
           print(f"Pausing for {pause_time:.1f} seconds before starting next chunk...")
           time.sleep(pause_time)
   
   return chunk_files

def resume_from_chunk(input_file, last_processed_chunk, output_file, start_date, end_date, 
                    include_prior_year=False, api_key=None, max_workers=3, chunk_size=10000):
   """
   Resume processing from a specific chunk number
   """
   # Read input CSV
   with open(input_file, 'r', encoding='utf-8') as csv_in:
       reader = csv.DictReader(csv_in)
       all_terms = list(reader)
   
   print(f"Found {len(all_terms)} MeSH terms in input file")
   
   # Calculate total chunks
   total_chunks = (len(all_terms) + chunk_size - 1) // chunk_size
   
   if last_processed_chunk >= total_chunks:
       print(f"Error: Last processed chunk ({last_processed_chunk}) is greater than or equal to total chunks ({total_chunks})")
       return []
   
   # Skip already processed chunks
   start_chunk = last_processed_chunk + 1
   start_idx = start_chunk * chunk_size
   remaining_terms = all_terms[start_idx:]
   
   print(f"Resuming from chunk {start_chunk} (skipping {start_idx} terms)")
   print(f"{len(remaining_terms)} terms left to process")
   
   # Calculate date range for prior year if needed
   prior_year_dates = None
   if include_prior_year:
       # MODIFIED SECTION: Use direct year replacement instead of timedelta
       # Parse current dates
       current_year = start_date.split('/')[0]
       prior_year = str(int(current_year) - 1)
       
       # Replace year in start and end dates
       prior_start_date = start_date.replace(current_year, prior_year)
       prior_end_date = end_date.replace(current_year, prior_year)
       
       prior_year_dates = (prior_start_date, prior_end_date)
       print(f"Prior year date range: {prior_start_date} to {prior_end_date}")
   
   # Prepare fieldnames for output
   fieldnames = ['UI', 'Name', 'Count', 'DateRange']
   if include_prior_year:
       fieldnames.extend(['PriorYearCount', 'PriorYearDateRange'])
   
   # Divide remaining terms into chunks
   chunks = [remaining_terms[i:i + chunk_size] for i in range(0, len(remaining_terms), chunk_size)]
   num_chunks = len(chunks)
   
   print(f"Remaining work divided into {num_chunks} chunks")
   print(f"Using {max_workers} parallel workers")
   
   chunk_files = []
   
   # Process each chunk
   for chunk_idx, chunk in enumerate(chunks):
       chunk_num = start_chunk + chunk_idx
       chunk_file = create_chunked_file_name(output_file, chunk_num)
       chunk_files.append(chunk_file)
       
       print(f"\nProcessing chunk {chunk_num}/{total_chunks} - {len(chunk)} terms")
       print(f"Results will be saved to: {chunk_file}")
       
       results = []
       
       # Process terms in parallel
       with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
           # Create a dict of futures to terms
           future_to_term = {
               executor.submit(
                   process_term, term, start_date, end_date, prior_year_dates, api_key
               ): term for term in chunk
           }
           
           # Process as they complete with a progress bar
           for future in tqdm(concurrent.futures.as_completed(future_to_term), total=len(chunk)):
               try:
                   result = future.result()
                   results.append(result)
               except Exception as exc:
                   term = future_to_term[future]
                   print(f"Term {term['Name']} generated an exception: {exc}")
       
       # Write results to file
       with open(chunk_file, 'w', newline='', encoding='utf-8') as csv_out:
           writer = csv.DictWriter(csv_out, fieldnames=fieldnames)
           writer.writeheader()
           
           # Sort results by UI to maintain order
           results.sort(key=lambda x: x['UI'])
           
           for result in results:
               writer.writerow(result)
               
       # Add a pause between chunks to be extra safe
       if chunk_idx < len(chunks) - 1:
           pause_time = random.uniform(5, 10)
           print(f"Pausing for {pause_time:.1f} seconds before starting next chunk...")
           time.sleep(pause_time)
   
   return chunk_files

def get_user_input():
   """
   Get all required inputs from the user through interactive prompts
   """
   print("\n=== PubMed MeSH Term Count Tool (BioPython Version) ===\n")
   
   # Hardcoded credentials
   email = "tomlaheyh" + chr(64) + "gmail.com"
   api_key_default = "667d9d4cd132c5923512c20ef2849169fb08"
   
   Entrez.email = email
   print(f"Using email: {email}")
   print(f"Using API key: {api_key_default[:10]}...{api_key_default[-4:]}")
   
   # Ask if resuming from a previous run
   is_resuming = input("Are you resuming from a previous run? (y/n): ").strip().lower() == 'y'
   
   # Get directory with current directory as default
   current_dir = os.getcwd()
   dir_input = input(f"Enter the directory path containing your MeSH terms file (default: {current_dir}): ").strip()
   dir_path = dir_input if dir_input else current_dir
   
   while not os.path.isdir(dir_path):
       print("Error: Directory not found. Please enter a valid directory path.")
       dir_input = input(f"Enter the directory path containing your MeSH terms file (default: {current_dir}): ").strip()
       dir_path = dir_input if dir_input else current_dir
   
   # Get input filename with desc2025.csv as default
   input_file_input = input("Enter the input CSV filename (default: desc2026.csv): ").strip()
   input_file = input_file_input if input_file_input else "desc2026.csv"
   input_path = os.path.join(dir_path, input_file)
   
   while not os.path.isfile(input_path):
       print(f"Error: File '{input_file}' not found in the specified directory.")
       input_file_input = input("Enter the input CSV filename (default: desc2026.csv): ").strip()
       input_file = input_file_input if input_file_input else "desc2026.csv"
       input_path = os.path.join(dir_path, input_file)
   
   # Get output filename with default
   output_file_input = input("Enter the output CSV filename (default: mesh_counts.csv): ").strip()
   output_file = output_file_input if output_file_input else "mesh_counts.csv"
   if not output_file.endswith('.csv'):
       output_file += '.csv'
   output_path = os.path.join(dir_path, output_file)
   
   # If resuming, get last processed chunk
   last_chunk = 0
   if is_resuming:
       last_chunk = input("Enter the last fully processed chunk number: ").strip()
       while not last_chunk.isdigit() or int(last_chunk) < 0:
           print("Error: Please enter a valid chunk number (0 or positive integer).")
           last_chunk = input("Enter the last fully processed chunk number: ").strip()
       last_chunk = int(last_chunk)
   
   # Get date range
   print("\nEnter the date range in YYYY/MM/DD format:")
   start_date = input("Start date: ").strip()
   while True:
       try:
           datetime.strptime(start_date, '%Y/%m/%d')
           break
       except ValueError:
           print("Invalid date format. Please use YYYY/MM/DD.")
           start_date = input("Start date: ").strip()
   
   end_date = input("End date: ").strip()
   while True:
       try:
           datetime.strptime(end_date, '%Y/%m/%d')
           break
       except ValueError:
           print("Invalid date format. Please use YYYY/MM/DD.")
           end_date = input("End date: ").strip()
   
   # Use hardcoded API key
   api_key = api_key_default
   
   # Prior year option
   prior_year = input("\nDo you want to include counts for the prior year? (y/n): ").strip().lower() == 'y'
   
   # Test mode option (not applicable when resuming)
   test_mode = False
   if not is_resuming:
       test_mode = input("\nDo you want to run in test mode? (process only 100 terms) (y/n): ").strip().lower() == 'y'
   
   # Parallel processing settings
   print("\nParallel processing settings:")
   max_workers = input("Enter the number of parallel workers (recommended: 2-3, default: 2): ").strip()
   max_workers = int(max_workers) if max_workers.isdigit() and int(max_workers) > 0 else 2
   
   # Chunk size for output files
   chunk_size = input("Enter chunk size (terms per output file, default: 10000): ").strip()
   chunk_size = int(chunk_size) if chunk_size.isdigit() and int(chunk_size) > 0 else 10000
   
   return {
       'dir_path': dir_path,
       'input_file': input_path,
       'output_file': output_path,
       'start_date': start_date,
       'end_date': end_date,
       'api_key': api_key,
       'prior_year': prior_year,
       'test_mode': test_mode,
       'max_workers': max_workers,
       'chunk_size': chunk_size,
       'is_resuming': is_resuming,
       'last_chunk': last_chunk,
       'email': email
   }

def combine_chunk_files(chunk_files, output_file):
   """Combine all chunk files into a single output file"""
   if not chunk_files:
       print("No chunk files to combine.")
       return False
   
   try:
       # Read the first file to get the header
       with open(chunk_files[0], 'r', encoding='utf-8') as f:
           reader = csv.reader(f)
           header = next(reader)
       
       # Combine into the original output file
       with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
           writer = csv.writer(outfile)
           writer.writerow(header)
           
           # Add data from each chunk
           for chunk_file in chunk_files:
               with open(chunk_file, 'r', encoding='utf-8') as infile:
                   reader = csv.reader(infile)
                   next(reader)  # Skip header
                   for row in reader:
                       writer.writerow(row)
       
       print(f"All chunks combined into: {output_file}")
       return True
   
   except Exception as e:
       print(f"Error combining chunk files: {e}")
       return False

def main():
   # Get all inputs through interactive prompts
   params = get_user_input()
   
   print("\nSummary of your selections:")
   print(f"- NCBI Email: {params['email']}")
   print(f"- Input file: {params['input_file']}")
   print(f"- Output file base: {params['output_file']} (will be split into chunks)")
   print(f"- Date range: {params['start_date']} to {params['end_date']}")
   print(f"- API key: {'Provided' if params['api_key'] else 'Not provided'}")
   print(f"- Prior year: {'Yes' if params['prior_year'] else 'No'}")
   
   if params['is_resuming']:
       print(f"- Resuming from after chunk: {params['last_chunk']}")
   else:
       print(f"- Test mode: {'Yes' if params['test_mode'] else 'No'}")
   
   print(f"- Parallel workers: {params['max_workers']}")
   print(f"- Chunk size: {params['chunk_size']} terms per output file")
   
   confirm = input("\nProceed with these settings? (y/n): ").strip().lower()
   if confirm != 'y':
       print("Operation cancelled.")
       return
   
   # Start processing
   start_time = time.time()
   
   try:
       if params['is_resuming']:
           print("\nResuming MeSH term processing from previous run...")
           chunk_files = resume_from_chunk(
               params['input_file'], 
               params['last_chunk'],
               params['output_file'],
               params['start_date'], 
               params['end_date'],
               params['prior_year'], 
               params['api_key'], 
               params['max_workers'], 
               params['chunk_size']
           )
       else:
           print("\nStarting parallel MeSH term processing...")
           chunk_files = process_mesh_terms_parallel(
               params['input_file'], 
               params['output_file'],
               params['start_date'], 
               params['end_date'],
               params['prior_year'], 
               params['api_key'], 
               params['test_mode'],
               params['max_workers'], 
               params['chunk_size']
           )
       
       elapsed_time = time.time() - start_time
       mins, secs = divmod(elapsed_time, 60)
       hours, mins = divmod(mins, 60)
       
       print(f"\nProcessing complete!")
       print(f"Time taken: {int(hours)}h {int(mins)}m {secs:.2f}s")
       
       if chunk_files:
           print(f"Results saved to {len(chunk_files)} chunk files:")
           for file in chunk_files:
               print(f"- {file}")
           
           # Automatically combine chunks and clean up
           print("\nCombining chunk files into final output...")
           
           # First, look for all existing chunk files if resuming
           if params['is_resuming']:
               base_name, ext = os.path.splitext(params['output_file'])
               dir_path = os.path.dirname(params['output_file'])
               all_files = os.listdir(dir_path)
               all_chunks = [os.path.join(dir_path, f) for f in all_files 
                            if f.startswith(os.path.basename(base_name)) and 
                            "_chunk" in f and f.endswith(ext)]
               
               if all_chunks:
                   print(f"Found {len(all_chunks)} total chunk files.")
                   chunk_files = sorted(all_chunks, key=lambda x: int(x.split('_chunk')[1].split('.')[0]))
           
           combined = combine_chunk_files(chunk_files, params['output_file'])
           
           if combined:
               # Automatically delete the chunk files
               print("Cleaning up individual chunk files...")
               for file in chunk_files:
                   try:
                       os.remove(file)
                       print(f"Deleted: {file}")
                   except Exception as e:
                       print(f"Could not delete {file}: {e}")
               print(f"\nFinal results saved to: {params['output_file']}")
           else:
               print("Warning: Could not combine chunk files. Individual chunks preserved.")
       else:
           print("No chunk files were produced. Please check for errors.")
       
   except Exception as e:
       print(f"\nAn error occurred during processing: {e}")
       print("Please check your input files and settings and try again.")
       
       # Provide information about resuming
       if not params['is_resuming']:
           print("\nIf the process was interrupted after completing some chunks, you can resume later.")
           print("Just run the script again and select 'y' when asked if you're resuming from a previous run.")

if __name__ == "__main__":
   main()