import xml.etree.ElementTree as ET
import csv
import os
import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path
import re

def extract_level_codes(tree_number):
    """Extract Level 1 and Level 2 codes from a tree number."""
    # Level 1 is just the first letter
    level1 = tree_number[0] if tree_number else ""
    
    # Level 2 is the letter plus the first two digits (if available)
    level2 = ""
    if len(tree_number) >= 3:
        match = re.match(r'([A-Z]\d{2})', tree_number)
        if match:
            level2 = match.group(1)
    
    return level1, level2

def process_mesh_file(input_file, output_file, log_widget=None):
    """Process the MeSH XML file and generate CSV output."""
    try:
        # Helper function to log messages
        def log(message):
            if log_widget:
                log_widget.insert(tk.END, message + "\n")
                log_widget.see(tk.END)
                log_widget.update()
            print(message)
        
        log(f"Processing file: {input_file}")
        
        # Dictionaries to store mappings
        level1_names = {}  # Maps Level 1 codes (A, B, C) to names
        level2_names = {}  # Maps Level 2 codes (A01, B01) to names
        descriptors = {}   # Maps Descriptor UIs to descriptor data
        
        # Parse the XML file
        log("Parsing XML file...")
        tree = ET.parse(input_file)
        root = tree.getroot()
        
        # First pass: Build mappings
        log("Building category mappings...")
        
        # Process all descriptor records
        for desc in root.findall('.//DescriptorRecord'):
            ui = desc.find('./DescriptorUI').text
            name = desc.find('./DescriptorName/String').text
            
            # Store basic descriptor info
            descriptors[ui] = {
                'UI': ui,
                'Name': name,
                'TreeNumbers': [],
                'ScopeNote': "",
                'DateCreated': "",
                'PharmActions': "",
                'AllowableQualifiers': "",
                'Synonyms': ""
            }
            
            # Extract tree numbers
            for tree_num in desc.findall('.//TreeNumber'):
                tree_number = tree_num.text
                descriptors[ui]['TreeNumbers'].append(tree_number)
                
                # Extract Level 1 and Level 2 codes
                level1, level2 = extract_level_codes(tree_number)
                
                # If this is a Level 1 descriptor (e.g., "Anatomy" with tree number "A")
                if tree_number == level1:
                    level1_names[level1] = name
                
                # If this is a Level 2 descriptor (e.g., "Body Regions" with tree number "A01")
                if tree_number == level2:
                    level2_names[level2] = name
            
            # Get scope note if available
            scope_note = desc.find('.//ScopeNote')
            descriptors[ui]['ScopeNote'] = scope_note.text.strip() if scope_note is not None else ""
            
            # Get creation date
            date_created = desc.find('./DateCreated')
            if date_created is not None:
                year = date_created.find('./Year').text
                month = date_created.find('./Month').text
                day = date_created.find('./Day').text
                descriptors[ui]['DateCreated'] = f"{year}-{month}-{day}"
            
            # Get pharmacological actions if available
            pharm_actions = []
            for action in desc.findall('.//PharmacologicalAction/DescriptorReferredTo/DescriptorName/String'):
                pharm_actions.append(action.text)
            descriptors[ui]['PharmActions'] = '; '.join(pharm_actions)
            
            # Get allowable qualifiers
            qualifiers = []
            for qualifier in desc.findall('.//AllowableQualifier/QualifierReferredTo/QualifierName/String'):
                qualifiers.append(qualifier.text)
            descriptors[ui]['AllowableQualifiers'] = '; '.join(qualifiers)
            
            # Get related terms (synonyms)
            synonyms = []
            for term in desc.findall('.//Term/String'):
                term_text = term.text
                if term_text not in synonyms and term_text != descriptors[ui]['Name']:
                    synonyms.append(term_text)
            descriptors[ui]['Synonyms'] = '; '.join(synonyms)
        
        log(f"Found {len(descriptors)} descriptors")
        log(f"Found {len(level1_names)} Level 1 categories")
        log(f"Found {len(level2_names)} Level 2 categories")
        
        # Second pass: Enrich descriptors with category information
        log("Enriching descriptors with category information...")
        
        # Process each descriptor to add hierarchical information
        for ui, descriptor in descriptors.items():
            # Initialize category sets (using sets to avoid duplicates)
            level1_cats = set()
            level1_names_set = set()
            level2_cats = set()
            level2_names_set = set()
            
            # Process each tree number
            for tree_number in descriptor['TreeNumbers']:
                level1, level2 = extract_level_codes(tree_number)
                
                # Add Level 1 category if valid
                if level1 and level1 in level1_names:
                    level1_cats.add(level1)
                    level1_names_set.add(level1_names[level1])
                
                # Add Level 2 category if valid
                if level2 and level2 in level2_names:
                    level2_cats.add(level2)
                    level2_names_set.add(level2_names[level2])
            
            # Convert sets to sorted semicolon-separated strings
            descriptor['Level1Categories'] = '; '.join(sorted(level1_cats))
            descriptor['Level1Names'] = '; '.join(sorted(level1_names_set))
            descriptor['Level2Categories'] = '; '.join(sorted(level2_cats))
            descriptor['Level2Names'] = '; '.join(sorted(level2_names_set))
            
            # Join tree numbers for output
            descriptor['TreeNumbers'] = '; '.join(descriptor['TreeNumbers'])
        
        log("All descriptors enriched with category information")
        
        # Convert dictionary to list for output
        descriptors_list = list(descriptors.values())
        
        # Define the field names for the CSV
        fieldnames = [
            'UI', 'Name', 'TreeNumbers', 
            'Level1Categories', 'Level1Names',
            'Level2Categories', 'Level2Names',
            'ScopeNote', 'DateCreated',
            'PharmActions', 'AllowableQualifiers', 'Synonyms'
        ]
        
        # Write to CSV
        log(f"Writing {len(descriptors_list)} descriptors to CSV...")
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(descriptors_list)
        
        log(f"Successfully processed {len(descriptors_list)} descriptors to {output_file}")
        return True
    
    except ET.ParseError as e:
        error_msg = f"Error parsing XML: {e}"
        if log_widget:
            log_widget.insert(tk.END, f"ERROR: {error_msg}\n")
            log_widget.see(tk.END)
        print(error_msg)
        return False
    except Exception as e:
        error_msg = f"An error occurred: {e}"
        if log_widget:
            log_widget.insert(tk.END, f"ERROR: {error_msg}\n")
            log_widget.see(tk.END)
        print(error_msg)
        return False

# Create the main application window
root = tk.Tk()
root.title("MeSH Processor")
root.geometry("600x500")

# Variables to store file paths
input_path = tk.StringVar()
output_path = tk.StringVar()

# Create the main container
main_frame = tk.Frame(root, padx=20, pady=20)
main_frame.pack(fill=tk.BOTH, expand=True)

# Input file selection
input_label = tk.Label(main_frame, text="Input MeSH XML File:")
input_label.pack(anchor=tk.W, pady=(0, 5))

input_frame = tk.Frame(main_frame)
input_frame.pack(fill=tk.X, pady=(0, 10))

input_entry = tk.Entry(input_frame, textvariable=input_path, width=50)
input_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))

def browse_input():
    filename = filedialog.askopenfilename(
        title="Select MeSH XML File",
        filetypes=[("XML files", "*.xml"), ("All files", "*.*")],
        initialdir=os.getcwd()
    )
    if filename:
        input_path.set(filename)
        output_path.set(str(Path(filename).with_suffix('.csv')))

input_button = tk.Button(input_frame, text="Browse...", command=browse_input)
input_button.pack(side=tk.RIGHT)

# Output file selection
output_label = tk.Label(main_frame, text="Output CSV File:")
output_label.pack(anchor=tk.W, pady=(0, 5))

output_frame = tk.Frame(main_frame)
output_frame.pack(fill=tk.X, pady=(0, 10))

output_entry = tk.Entry(output_frame, textvariable=output_path, width=50)
output_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))

def browse_output():
    filename = filedialog.asksaveasfilename(
        title="Save CSV As",
        filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
        defaultextension=".csv",
        initialdir=os.path.dirname(input_path.get()) if input_path.get() else os.getcwd()
    )
    if filename:
        output_path.set(filename)

output_button = tk.Button(output_frame, text="Browse...", command=browse_output)
output_button.pack(side=tk.RIGHT)

# Log area
log_label = tk.Label(main_frame, text="Processing Log:")
log_label.pack(anchor=tk.W, pady=(0, 5))

log_frame = tk.Frame(main_frame)
log_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

log_text = tk.Text(log_frame, height=15, width=70)
log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

log_scroll = tk.Scrollbar(log_frame, command=log_text.yview)
log_scroll.pack(side=tk.RIGHT, fill=tk.Y)
log_text.configure(yscrollcommand=log_scroll.set)

# Button to process file
def process_file():
    input_file = input_path.get()
    output_file = output_path.get()
    
    if not input_file:
        messagebox.showwarning("Input Required", "Please select an input XML file.")
        return
    
    if not output_file:
        messagebox.showwarning("Output Required", "Please specify an output CSV file.")
        return
    
    # Clear log
    log_text.delete(1.0, tk.END)
    
    # Process file
    success = process_mesh_file(input_file, output_file, log_text)
    
    if success:
        messagebox.showinfo("Success", f"Successfully processed MeSH file.\nOutput saved to {output_file}")

button_frame = tk.Frame(main_frame)
button_frame.pack(fill=tk.X, pady=(10, 0))

# Add a spacer to push buttons to the right
spacer = tk.Frame(button_frame)
spacer.pack(side=tk.LEFT, fill=tk.X, expand=True)

process_button = tk.Button(button_frame, text="Process File", command=process_file, 
                          bg="#4CAF50", fg="white", padx=10, pady=5)
process_button.pack(side=tk.RIGHT, padx=(0, 10))

exit_button = tk.Button(button_frame, text="Exit", command=root.destroy,
                       bg="#f44336", fg="white", padx=10, pady=5)
exit_button.pack(side=tk.RIGHT)

# Start the GUI event loop
root.mainloop()