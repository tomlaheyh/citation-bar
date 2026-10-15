import urllib.request
import os

def download_file(url, output_filename):
    """Download a file from URL and save it locally."""
    print(f"Downloading: {output_filename}")
    print(f"From: {url}")
    print("This may take a few minutes for large files...")
    
    try:
        # Download with progress indication
        def report_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(downloaded * 100 / total_size, 100)
                print(f"\rProgress: {percent:.1f}% ({downloaded:,} / {total_size:,} bytes)", end='')
        
        urllib.request.urlretrieve(url, output_filename, reporthook=report_progress)
        print(f"\n✓ Successfully downloaded: {output_filename}")
        
        # Check file size
        file_size = os.path.getsize(output_filename)
        print(f"File size: {file_size:,} bytes ({file_size / (1024*1024):.2f} MB)")
        return True
        
    except Exception as e:
        print(f"\n✗ Error downloading file: {e}")
        return False

def main():
    print("=" * 60)
    print("MeSH 2026 File Downloader")
    print("=" * 60)
    
    # Base URL for MeSH files
    base_url = "https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/"
    
    # Files available for download
    files = {
        '1': ('desc2026.xml', 'Descriptors (main file for Step 01)'),
        '2': ('qual2026.xml', 'Qualifiers'),
        '3': ('supp2026.xml', 'Supplementary Concepts')
    }
    
    print("\nAvailable files:")
    for key, (filename, description) in files.items():
        print(f"  {key}. {filename} - {description}")
    
    print("\nWhich file(s) do you want to download?")
    print("Enter numbers separated by commas (e.g., 1,2) or 'all' for all files")
    choice = input("Your choice: ").strip().lower()
    
    # Determine which files to download
    to_download = []
    if choice == 'all':
        to_download = list(files.values())
    else:
        selections = [s.strip() for s in choice.split(',')]
        for sel in selections:
            if sel in files:
                to_download.append(files[sel])
    
    if not to_download:
        print("No valid selection made. Exiting.")
        return
    
    # Get output directory
    output_dir = input("\nEnter directory to save files (press Enter for current directory): ").strip()
    if not output_dir:
        output_dir = os.getcwd()
    
    # Create directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
    
    print(f"\nFiles will be saved to: {output_dir}")
    print()
    
    # Download each selected file
    success_count = 0
    for filename, description in to_download:
        url = base_url + filename
        output_path = os.path.join(output_dir, filename)
        
        print("-" * 60)
        if download_file(url, output_path):
            success_count += 1
        print()
    
    print("=" * 60)
    print(f"Download complete: {success_count}/{len(to_download)} files successful")
    print("=" * 60)

if __name__ == "__main__":
    main()
